import { runYosys } from '@yowasp/yosys';

// @ts-ignore
import { yosys2digitaljs } from 'yosys2digitaljs/core';

export async function synthesizeVerilog(
  filesData: { name: string, content: string }[], 
  options: { optimize?: boolean, simplify?: boolean } = { optimize: false, simplify: true }
): Promise<any> {
  if (!filesData || filesData.length === 0) {
    throw new Error('Sentezlenecek dosya bulunamadı.');
  }

  // Yosys sanal dosya sistemini (VFS) oluştur
  const files: Record<string, string | Uint8Array> = {};
  
  // Yosys'in her bir dosyayı okuması için komut dizisi
  const readCommands: string[] = [];

  for (const file of filesData) {
    // Sadece geçerli Verilog/SystemVerilog dosyalarını dahil et (isteğe bağlı güvenlik önlemi)
    const fileName = (!file.name.endsWith('.v') && !file.name.endsWith('.sv')) ? file.name + '.sv' : file.name;
    
    files[fileName] = file.content;
    readCommands.push(`read_verilog -sv ${fileName}`);
  }

  // Komut dizisini başlat ve dosyaları oku
  const commands = [
    ...readCommands
  ];
  
  commands.push('hierarchy -auto-top -check');
  // proc komutu always bloklarını (process) sentezlenebilir MUX ve FF'lere çevirir, her zaman çalışmalıdır.
  commands.push('proc');

  if (options.optimize) {
    // VS Code DigitalJS eklentisindeki varsayılan optimizasyon (opt ve memory dönüşümleri)
    commands.push('opt');
    commands.push('memory -nomap');
    commands.push('wreduce -memx');
    commands.push('opt -full');
  } else {
    // Optimizasyon seçili değilse sadece basit temizlik yap
    commands.push('opt_clean');
  }

  commands.push('clean');
  commands.push('write_json output.json');

  const command = commands.join('; ');

  const args = ['-p', command];

  let stdoutLog = '';
  let stderrLog = '';

  const resultFiles = await runYosys(args, files, {
    print: (text: string) => { stdoutLog += text + '\n'; },
    printErr: (text: string) => { stderrLog += text + '\n'; }
  } as any);

  if (resultFiles && resultFiles['output.json']) {
    const jsonRaw = resultFiles['output.json'];
    const jsonString = typeof jsonRaw === 'string' ? jsonRaw : new TextDecoder().decode(jsonRaw as Uint8Array);
    const rawYosysJson = JSON.parse(jsonString);
    
    // Top modülü belirle. Yosys `hierarchy -auto-top` kullanıldığında ana modülün attributes objesinde `top: 1` bulunur.
    let topModule = '';
    const moduleNames = Object.keys(rawYosysJson.modules || {});
    
    for (const modName of moduleNames) {
      if (rawYosysJson.modules[modName].attributes?.top === 1 || rawYosysJson.modules[modName].attributes?.top === "00000000000000000000000000000001") {
        topModule = modName;
        break;
      }
    }
    
    // Eğer `top` özelliği bulunamazsa, ilk modülü (veya içinde instantiation olmayan modülü) fallback olarak al
    if (!topModule && moduleNames.length > 0) {
      topModule = moduleNames[moduleNames.length - 1]; // Genelde Yosys top modülü sona koyar ama emin olmak için
    }

    if (!topModule) {
      throw new Error('Sentezleme sonucunda hiçbir modül bulunamadı.');
    }

    // yosys2digitaljs ile çevir
    const digitalJsData = yosys2digitaljs(rawYosysJson);
    
    // Çıkış portlarını düzelt ve kapı isimlerini (Label) temizle
    if (digitalJsData && digitalJsData.devices) {
      const mod = rawYosysJson.modules[topModule];
      const ports = mod?.ports || {};
      
      // Port bit haritası (bit id'sinden port adına ulaşmak için)
      const bitToPort: Record<string, string> = {};
      for (const [pName, pData] of Object.entries<any>(ports)) {
        if (pData.bits) {
          pData.bits.forEach((b: number | string) => { bitToPort[b.toString()] = pName; });
        }
      }

      for (const devId in digitalJsData.devices) {
        const dev = digitalJsData.devices[devId];

        // 1. Kapı isimlendirmeleri (Yosys $ isimleri hariç gerçek isimleri sakla)
        let givenName = '';
        if (dev.label && !dev.label.startsWith('$') && !dev.label.startsWith('dev')) {
          givenName = dev.label;
        } else if (!devId.startsWith('$') && !devId.startsWith('dev')) {
          givenName = devId;
        }
        
        if (givenName) {
           dev.given_name = givenName;
        }

        // Kapıların altında kapı türünün yazması için label alanına type'ı atıyoruz.
        // Input ve Output hariç.
        if (dev.type !== 'Input' && dev.type !== 'Output') {
           dev.label = dev.type;
        }

        // 2. Input ve Output portlarının isimlerini gerçek port isimleriyle değiştir
        if (dev.type === 'Input' || dev.type === 'Output') {
          // Eğer label atanmamışsa veya 'dev' ile başlıyorsa gerçek ismini bulalım
          if (!dev.label || dev.label.startsWith('dev') || dev.label === 'Input' || dev.label === 'Output') {
            if (typeof dev.net === 'string') {
              dev.label = dev.net;
            } else if (Array.isArray(dev.net) && dev.net.length > 0) {
              const bit = dev.net[0].toString();
              if (bitToPort[bit]) {
                dev.label = bitToPort[bit];
              }
            }
          }

          // Çıkış (Output) net'i düzeltmesi (Eksik in bağlantısı varsa)
          if (dev.type === 'Output') {
            if (!dev.connections) dev.connections = {};
            if (!dev.connections.in && dev.net) {
              dev.connections.in = dev.net;
            }
          }
        }
      }
    }
    
    // Metadata for workspace diagnostics and inspection
    (digitalJsData as any)._topModule = topModule;
    (digitalJsData as any)._stdout = stdoutLog;
    (digitalJsData as any)._stderr = stderrLog;
    (digitalJsData as any)._rawYosysJson = rawYosysJson;

    return digitalJsData;
  }

  const errorDetails = (stderrLog.trim() || stdoutLog.trim() || 'Yosys synthesis failed to generate circuit output.');
  const err = new Error(errorDetails);
  (err as any).stdout = stdoutLog;
  (err as any).stderr = stderrLog;
  throw err;
}


