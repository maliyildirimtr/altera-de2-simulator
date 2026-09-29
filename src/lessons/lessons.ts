/**
 * Guided lessons that follow a first course in digital logic. Each lesson is
 * a short explanation, the key points, hands-on links into the tools
 * (gate designer presets, DE2 examples, auto-graded exercises) and a quiz.
 */
export type L = { en: string; tr: string };

export type LessonAction =
  | { kind: 'gates'; preset: string; label: L }
  | { kind: 'example'; id: string; label: L }
  | { kind: 'exercise'; id: string; label: L }
  | { kind: 'kmap'; expr: string; label: L }
  /** An auto-graded task solved by drawing gates (Gate Designer exercise mode). */
  | { kind: 'gateExercise'; id: string; label: L }
  /** A machine opened in the FSM designer. */
  | { kind: 'fsm'; preset: string; label: L }
  | { kind: 'numbers'; label: L };

export interface QuizQuestion {
  q: L;
  options: L[];
  answer: number;
  why: L;
}

export interface Lesson {
  id: string;
  title: L;
  summary: L;
  body: L[];
  points: L[];
  actions: LessonAction[];
  quiz: QuizQuestion[];
}

const t = (en: string, tr: string): L => ({ en, tr });

export const LESSONS: Lesson[] = [
  {
    id: 'numbers',
    title: t('Number systems', 'Sayı sistemleri'),
    summary: t('Binary, hexadecimal and negative numbers in two\'s complement.', 'İkilik, onaltılık ve ikiye tümleyende negatif sayılar.'),
    body: [
      t('Digital circuits store numbers as bits. In binary each position is worth twice the one to its right: 1011₂ = 8 + 2 + 1 = 11. Hexadecimal groups four bits into one digit 0–F, so 1011 0110₂ = B6₁₆.',
        'Sayısal devreler sayıları bit olarak saklar. İkilik tabanda her basamak sağındakinin iki katı değerindedir: 1011₂ = 8 + 2 + 1 = 11. Onaltılık taban dört biti tek bir 0–F basamağında toplar: 1011 0110₂ = B6₁₆.'),
      t('With n bits you can count from 0 to 2ⁿ − 1. Negative numbers use two\'s complement: invert every bit and add 1. In 8 bits, −5 is 1111 1011, and the range is −128 … 127.',
        "n bitle 0'dan 2ⁿ − 1'e kadar sayılır. Negatif sayılar ikiye tümleyen ile yazılır: tüm bitleri ters çevirip 1 ekle. 8 bitte −5, 1111 1011'dir ve aralık −128 … 127'dir."),
      t('In Verilog a number carries its width and base: 4\'b1011, 8\'hB6, 6\'d42.', "Verilog'da bir sayı genişliğini ve tabanını taşır: 4'b1011, 8'hB6, 6'd42."),
    ],
    points: [
      t('One hex digit = four bits.', 'Bir onaltılık basamak = dört bit.'),
      t('Two\'s complement: invert and add 1.', 'İkiye tümleyen: ters çevir ve 1 ekle.'),
      t('n bits hold 2ⁿ different values.', 'n bit 2ⁿ farklı değer tutar.'),
    ],
    actions: [
      { kind: 'numbers', label: t('Convert and see the steps', 'Dönüştür ve adımları gör') },
      { kind: 'example', id: 'de2_interactive_io', label: t('Switches as a hex digit on the DE2', "Anahtarlar DE2'de onaltılık rakam olarak") },
    ],
    quiz: [
      { q: t('What is 1101₂ in decimal?', '1101₂ onluk tabanda kaçtır?'), options: [t('11', '11'), t('13', '13'), t('14', '14')], answer: 1, why: t('8 + 4 + 1 = 13.', '8 + 4 + 1 = 13.') },
      { q: t('What is 0x2F in binary?', '0x2F ikilik tabanda nedir?'), options: [t('0010 1111', '0010 1111'), t('0010 1110', '0010 1110'), t('1111 0010', '1111 0010')], answer: 0, why: t('2 = 0010 and F = 1111.', '2 = 0010 ve F = 1111.') },
      { q: t('In 8-bit two\'s complement, 1111 1111 is…', '8 bitlik ikiye tümleyende 1111 1111 kaçtır?'), options: [t('255', '255'), t('−1', '−1'), t('−127', '−127')], answer: 1, why: t('Invert (0000 0000) and add 1: the magnitude is 1, so the value is −1.', "Ters çevir (0000 0000) ve 1 ekle: büyüklük 1, yani değer −1.") },
    ],
  },
  {
    id: 'gates',
    title: t('Logic gates', 'Mantık kapıları'),
    summary: t('The building blocks: AND, OR, NOT and their relatives.', 'Yapı taşları: VE, VEYA, DEĞİL ve akrabaları.'),
    body: [
      t('A digital signal has two values, 0 and 1. A logic gate takes one or more such signals and produces an output according to a fixed rule.',
        'Sayısal bir sinyalin iki değeri vardır: 0 ve 1. Bir mantık kapısı bir veya daha fazla sinyal alır ve sabit bir kurala göre çıkış üretir.'),
      t('AND is 1 only when all inputs are 1; OR is 1 when at least one input is 1; NOT inverts its input. NAND and NOR are AND and OR followed by NOT, and XOR is 1 when its two inputs differ.',
        'VE (AND) yalnızca tüm girişler 1 iken 1 olur; VEYA (OR) en az bir giriş 1 iken 1 olur; DEĞİL (NOT) girişini tersler. NAND ve NOR, VE ve VEYA kapılarının arkasına DEĞİL eklenmiş halidir; XOR ise iki girişi farklıyken 1 olur.'),
      t('NAND (and also NOR) is universal: any circuit can be built from NAND gates alone. This is why real chips are often described in terms of NAND gates.',
        'NAND (ve NOR) evrenseldir: her devre yalnızca NAND kapılarıyla kurulabilir. Gerçek yongaların çoğu zaman NAND kapıları cinsinden anlatılmasının nedeni budur.'),
    ],
    points: [
      t('In Verilog: & (AND), | (OR), ~ (NOT), ^ (XOR).', "Verilog'da: & (VE), | (VEYA), ~ (DEĞİL), ^ (XOR)."),
      t('A gate with n inputs has 2ⁿ input combinations.', 'n girişli bir kapının 2ⁿ giriş kombinasyonu vardır.'),
      t('A small circle (bubble) on a symbol means inversion.', 'Sembol üzerindeki küçük daire (kabarcık) tersleme demektir.'),
    ],
    actions: [
      { kind: 'gates', preset: 'half_adder', label: t('Build with gates', 'Kapılarla kur') },
      { kind: 'example', id: 'basic_gates', label: t('Try all gates on the DE2', "Tüm kapıları DE2'de dene") },
      { kind: 'exercise', id: 'and_or', label: t('Exercise: AND-OR function', 'Alıştırma: VE-VEYA fonksiyonu') },
      { kind: 'gateExercise', id: 'and_or', label: t('Solve with gates: AND-OR function', 'Kapılarla çöz: VE-VEYA fonksiyonu') },
    ],
    quiz: [
      { q: t('A = 1, B = 0. What is A AND B?', 'A = 1, B = 0. A VE B nedir?'), options: [t('0', '0'), t('1', '1')], answer: 0, why: t('AND needs every input to be 1.', 'VE kapısı tüm girişlerin 1 olmasını ister.') },
      { q: t('When is XOR equal to 1?', 'XOR ne zaman 1 olur?'), options: [t('When both inputs are 1', 'İki giriş de 1 iken'), t('When the inputs differ', 'Girişler farklıyken'), t('When both inputs are 0', 'İki giriş de 0 iken')], answer: 1, why: t('XOR is "exclusive or": exactly one input is 1.', 'XOR "özel veya"dır: girişlerden tam olarak biri 1 olmalı.') },
      { q: t('Which gate alone can build any circuit?', 'Tek başına her devreyi kurabilen kapı hangisi?'), options: [t('XOR', 'XOR'), t('AND', 'AND'), t('NAND', 'NAND')], answer: 2, why: t('NAND is universal: NOT, AND and OR can all be made from it.', 'NAND evrenseldir: DEĞİL, VE ve VEYA ondan yapılabilir.') },
    ],
  },
  {
    id: 'boolean',
    title: t('Boolean algebra and truth tables', 'Boole cebri ve doğruluk tabloları'),
    summary: t('Describing and simplifying logic functions.', 'Mantık fonksiyonlarını tanımlamak ve sadeleştirmek.'),
    body: [
      t('A truth table lists the output for every input combination. It is the complete specification of a combinational circuit.',
        'Doğruluk tablosu her giriş kombinasyonu için çıkışı listeler. Kombinasyonel bir devrenin eksiksiz tanımıdır.'),
      t('From a truth table you can write a sum of products: one AND term per row where the output is 1, all ORed together. Boolean algebra (and Karnaugh maps) then simplify it.',
        'Doğruluk tablosundan çarpımların toplamı yazılabilir: çıkışın 1 olduğu her satır için bir VE terimi, hepsi VEYA ile birleştirilir. Sonra Boole cebri (ve Karnaugh haritaları) ile sadeleştirilir.'),
      t("De Morgan's laws connect AND and OR through inversion: ~(a & b) = ~a | ~b and ~(a | b) = ~a & ~b.",
        "De Morgan kuralları VE ile VEYA'yı tersleme üzerinden bağlar: ~(a & b) = ~a | ~b ve ~(a | b) = ~a & ~b."),
    ],
    points: [
      t('n inputs → 2ⁿ rows.', 'n giriş → 2ⁿ satır.'),
      t('Fewer terms and literals mean fewer gates.', 'Daha az terim ve değişken, daha az kapı demektir.'),
      t('Check your design against the table: the exercises do exactly that.', 'Tasarımını tabloyla karşılaştır: alıştırmalar tam olarak bunu yapar.'),
    ],
    actions: [
      { kind: 'kmap', expr: "ab + a'c + bc", label: t('Simplify with a Karnaugh map', 'Karnaugh haritasıyla sadeleştir') },
      { kind: 'exercise', id: 'majority3', label: t('Exercise: majority of three', 'Alıştırma: üçün çoğunluğu') },
      { kind: 'exercise', id: 'parity4', label: t('Exercise: parity bit', 'Alıştırma: eşlik biti') },
      { kind: 'gateExercise', id: 'majority3', label: t('Solve with gates: majority of three', 'Kapılarla çöz: üçün çoğunluğu') },
    ],
    quiz: [
      { q: t('How many rows does a truth table with 4 inputs have?', '4 girişli bir doğruluk tablosunda kaç satır vardır?'), options: [t('8', '8'), t('16', '16'), t('4', '4')], answer: 1, why: t('2⁴ = 16.', '2⁴ = 16.') },
      { q: t('~(a & b) equals…', '~(a & b) neye eşittir?'), options: [t('~a & ~b', '~a & ~b'), t('~a | ~b', '~a | ~b'), t('a | b', 'a | b')], answer: 1, why: t("De Morgan: the inversion turns AND into OR and inverts each input.", 'De Morgan: tersleme VE\'yi VEYA\'ya çevirir ve her girişi tersler.') },
      { q: t('In a sum of products, each product term corresponds to…', 'Çarpımların toplamında her çarpım terimi neye karşılık gelir?'), options: [t('a row where the output is 1', 'çıkışın 1 olduğu bir satıra'), t('a row where the output is 0', 'çıkışın 0 olduğu bir satıra'), t('an input column', 'bir giriş sütununa')], answer: 0, why: t('Each 1-row contributes one AND term.', 'Çıkışı 1 olan her satır bir VE terimi ekler.') },
    ],
  },
  {
    id: 'adders',
    title: t('Adders', 'Toplayıcılar'),
    summary: t('Adding binary numbers with gates.', 'İkilik sayıları kapılarla toplamak.'),
    body: [
      t('A half adder adds two bits: sum = a XOR b, carry = a AND b. A full adder also takes a carry-in: sum = a ^ b ^ cin, cout = (a & b) | (cin & (a ^ b)).',
        'Yarım toplayıcı iki biti toplar: sum = a XOR b, carry = a AND b. Tam toplayıcı bir de elde girişi alır: sum = a ^ b ^ cin, cout = (a & b) | (cin & (a ^ b)).'),
      t('Chaining full adders, each carry-out feeding the next carry-in, gives a ripple-carry adder for numbers of any width. It is simple but the carry has to ripple through every stage, which sets its speed.',
        'Tam toplayıcılar zincirlenip her elde çıkışı bir sonrakinin elde girişine bağlanınca istenen genişlikte bir dalgalı elde (ripple-carry) toplayıcı elde edilir. Basittir ama elde her kademeden geçmek zorunda olduğu için hızını bu belirler.'),
    ],
    points: [
      t('1 + 1 = 10 in binary: sum 0, carry 1.', 'İkilikte 1 + 1 = 10: toplam 0, elde 1.'),
      t('An n-bit adder produces an n-bit sum and a carry-out.', 'n bitlik toplayıcı n bitlik toplam ve bir elde çıkışı üretir.'),
    ],
    actions: [
      { kind: 'gates', preset: 'half_adder', label: t('Half adder in the gate designer', 'Kapı tasarımcısında yarım toplayıcı') },
      { kind: 'gates', preset: 'full_adder', label: t('Full adder from two half adders', 'İki yarım toplayıcıdan tam toplayıcı') },
      { kind: 'example', id: 'full_adder', label: t('Full adder on the DE2', "Tam toplayıcı DE2'de") },
      { kind: 'exercise', id: 'full_adder', label: t('Exercise: full adder', 'Alıştırma: tam toplayıcı') },
      { kind: 'exercise', id: 'adder4', label: t('Exercise: 4-bit adder', 'Alıştırma: 4 bitlik toplayıcı') },
      { kind: 'gates', preset: 'adder4', label: t('4-bit adder with gates', 'Kapılarla 4 bitlik toplayıcı') },
      { kind: 'gateExercise', id: 'half_adder', label: t('Solve with gates: half adder', 'Kapılarla çöz: yarım toplayıcı') },
    ],
    quiz: [
      { q: t('Half adder, a = 1, b = 1: sum and carry?', 'Yarım toplayıcı, a = 1, b = 1: toplam ve elde?'), options: [t('sum 1, carry 0', 'toplam 1, elde 0'), t('sum 0, carry 1', 'toplam 0, elde 1'), t('sum 1, carry 1', 'toplam 1, elde 1')], answer: 1, why: t('1 + 1 = 10 in binary.', 'İkilikte 1 + 1 = 10.') },
      { q: t('What limits the speed of a ripple-carry adder?', 'Dalgalı elde toplayıcının hızını ne sınırlar?'), options: [t('The number of inputs', 'Giriş sayısı'), t('The carry passing through every stage', 'Eldenin her kademeden geçmesi'), t('The clock frequency', 'Saat frekansı')], answer: 1, why: t('The last sum bit waits for the carry from the first stage.', 'Son toplam biti ilk kademeden gelen eldeyi bekler.') },
    ],
  },
  {
    id: 'mux',
    title: t('Multiplexers and decoders', 'Çoklayıcılar ve kod çözücüler'),
    summary: t('Choosing and addressing signals.', 'Sinyal seçmek ve adreslemek.'),
    body: [
      t('A multiplexer (mux) chooses one of several inputs with a select signal: y = sel ? b : a. With k select bits it chooses among 2ᵏ inputs.',
        'Çoklayıcı (mux) bir seçme sinyaliyle birkaç girişten birini seçer: y = sel ? b : a. k seçme bitiyle 2ᵏ giriş arasından seçim yapar.'),
      t('A decoder does the opposite kind of job: it turns an n-bit code into 2ⁿ lines, exactly one of which is active. Decoders select memory rows, drive seven-segment displays and enable devices.',
        'Kod çözücü ise n bitlik bir kodu, tam olarak biri aktif olan 2ⁿ hatta dönüştürür. Kod çözücüler bellek satırlarını seçer, yedi parçalı göstergeleri sürer ve cihazları etkinleştirir.'),
    ],
    points: [
      t('2:1 mux as gates: y = (a & ~sel) | (b & sel).', 'Kapılarla 2:1 mux: y = (a & ~sel) | (b & sel).'),
      t('In Verilog, case statements and the ?: operator describe muxes naturally.', "Verilog'da case ifadeleri ve ?: operatörü mux'ları doğal biçimde anlatır."),
    ],
    actions: [
      { kind: 'gates', preset: 'mux2', label: t('2:1 mux in the gate designer', 'Kapı tasarımcısında 2:1 mux') },
      { kind: 'gates', preset: 'mux4', label: t('4:1 mux block', '4:1 mux bloğu') },
      { kind: 'example', id: 'decoder_3to8', label: t('3-to-8 decoder on the DE2', "3'ten 8'e kod çözücü DE2'de") },
      { kind: 'exercise', id: 'mux4', label: t('Exercise: 4:1 mux', 'Alıştırma: 4:1 mux') },
      { kind: 'exercise', id: 'decoder2to4', label: t('Exercise: 2-to-4 decoder', "Alıştırma: 2'den 4'e kod çözücü") },
      { kind: 'gates', preset: 'mux4', label: t('4:1 mux with gates', 'Kapılarla 4:1 mux') },
      { kind: 'gateExercise', id: 'mux2', label: t('Solve with gates: 2:1 mux', 'Kapılarla çöz: 2:1 mux') },
    ],
    quiz: [
      { q: t('How many select bits does an 8:1 mux need?', '8:1 mux kaç seçme biti gerektirir?'), options: [t('2', '2'), t('3', '3'), t('8', '8')], answer: 1, why: t('2³ = 8.', '2³ = 8.') },
      { q: t('How many outputs of a 3-to-8 decoder are active at once?', "3'ten 8'e kod çözücünün aynı anda kaç çıkışı aktiftir?"), options: [t('Exactly one', 'Tam olarak bir'), t('Three', 'Üç'), t('All eight', 'Sekizi de')], answer: 0, why: t('Each input code selects one line.', 'Her giriş kodu tek bir hattı seçer.') },
    ],
  },
  {
    id: 'sequential',
    title: t('Flip-flops, registers and counters', "Flip-flop'lar, yazmaçlar ve sayıcılar"),
    summary: t('Circuits with memory and a clock.', 'Belleği ve saati olan devreler.'),
    body: [
      t('Combinational outputs depend only on the current inputs. Sequential circuits also remember: a D flip-flop copies D to Q at each rising clock edge and holds it until the next edge.',
        'Kombinasyonel çıkışlar yalnızca o anki girişlere bağlıdır. Ardışık devreler ise hatırlar: D flip-flop her yükselen saat kenarında D\'yi Q\'ya kopyalar ve bir sonraki kenara kadar tutar.'),
      t('Groups of flip-flops form registers. Feeding a register back through an adder gives a counter. In Verilog these are written in always_ff @(posedge clk) blocks with non-blocking assignments (<=).',
        "Flip-flop grupları yazmaçları oluşturur. Bir yazmacı toplayıcı üzerinden geri beslemek bir sayıcı verir. Verilog'da bunlar always_ff @(posedge clk) bloklarında non-blocking (<=) atamalarla yazılır."),
      t('On the DE2 the 50 MHz CLOCK_50 drives them. In the simulator you can step the clock one edge at a time and watch the registers in the logic analyzer.',
        "DE2'de bunları 50 MHz'lik CLOCK_50 sürer. Simülatörde saati kenar kenar ilerletip yazmaçları mantık analizöründe izleyebilirsin."),
    ],
    points: [
      t('Use <= in clocked blocks and = in combinational blocks.', 'Saatli bloklarda <=, kombinasyonel bloklarda = kullan.'),
      t('A synchronous reset is checked first inside the clocked block.', 'Senkron reset saatli bloğun içinde ilk kontrol edilir.'),
    ],
    actions: [
      { kind: 'gates', preset: 'dff', label: t('D flip-flop in the gate designer', 'Kapı tasarımcısında D flip-flop') },
      { kind: 'gates', preset: 'counter4', label: t('Ripple counter with T flip-flops', 'T flip-floplarla dalgalı sayıcı') },
      { kind: 'example', id: 'counter_4bit', label: t('4-bit counter on the DE2', "4 bitlik sayıcı DE2'de") },
      { kind: 'exercise', id: 'dff_en', label: t('Exercise: D flip-flop with enable', 'Alıştırma: yetkili D flip-flop') },
      { kind: 'exercise', id: 'counter4', label: t('Exercise: 4-bit counter', 'Alıştırma: 4 bitlik sayıcı') },
      { kind: 'exercise', id: 'shift4', label: t('Exercise: shift register', 'Alıştırma: kaydırmalı yazmaç') },
      { kind: 'gates', preset: 'counter4', label: t('Ripple counter with flip-flops', "Flip-flop'larla dalgalı sayıcı") },
      { kind: 'gates', preset: 'reg_counter', label: t('Counter with a register and buses', 'Yazmaç ve bus ile sayıcı') },
      { kind: 'gateExercise', id: 'dff_en', label: t('Solve with gates: D flip-flop with enable', 'Kapılarla çöz: yetkili D flip-flop') },
    ],
    quiz: [
      { q: t('When does a positive-edge D flip-flop update Q?', 'Yükselen kenar D flip-flop Q\'yu ne zaman günceller?'), options: [t('Whenever D changes', 'D her değiştiğinde'), t('At the clock\'s 0→1 transition', 'Saatin 0→1 geçişinde'), t('While the clock is 1', 'Saat 1 olduğu sürece')], answer: 1, why: t('Only the rising edge matters.', 'Yalnızca yükselen kenar önemlidir.') },
      { q: t('Which assignment belongs in always_ff?', 'always_ff içinde hangi atama kullanılır?'), options: [t('=', '='), t('<=', '<='), t('assign', 'assign')], answer: 1, why: t('Non-blocking assignments update all registers together at the edge.', 'Non-blocking atamalar tüm yazmaçları kenarda birlikte günceller.') },
      { q: t('A 4-bit counter at 15 counts up once. Result?', '15\'teki 4 bitlik sayıcı bir kez sayarsa sonuç?'), options: [t('16', '16'), t('0', '0'), t('15', '15')], answer: 1, why: t('4 bits hold 0–15; it wraps around to 0.', '4 bit 0–15 tutar; 0\'a döner.') },
    ],
  },
  {
    id: 'memory',
    title: t('Buses, registers and memory', 'Bus, yazmaç ve bellek'),
    summary: t('Moving numbers instead of single bits.', 'Tek bitler yerine sayıları taşımak.'),
    body: [
      t('A bus is a group of wires that carries a number: a 4-bit bus carries 0–15. Splitters and mergers take a bus apart into its bits and put bits back together.',
        'Bus, bir sayıyı taşıyan tel grubudur: 4 bitlik bir bus 0–15 arasını taşır. Ayırıcı ve birleştirici bir bus\'ı bitlerine ayırır ve bitleri yeniden bir araya getirir.'),
      t('A register is a row of D flip-flops that share a clock: on each rising edge it stores the whole number at its input, optionally only while an enable input is 1.',
        'Yazmaç, aynı saati paylaşan bir sıra D flip-flop\'tur: her yükselen kenarda girişindeki sayının tamamını saklar; istenirse yalnızca yetki (enable) girişi 1 iken.'),
      t('A RAM stores many words: the address selects one, a write stores the data at that address on the clock edge, and the output always shows the addressed word. A ROM is read-only: its contents are fixed.',
        'RAM birçok kelime saklar: adres birini seçer, yazma işlemi saat kenarında veriyi o adrese kaydeder ve çıkış her zaman seçili kelimeyi gösterir. ROM yalnızca okunur: içeriği sabittir.'),
    ],
    points: [
      t('A register + an adder = a counter.', 'Yazmaç + toplayıcı = sayıcı.'),
      t('An n-bit address selects one of 2ⁿ words.', 'n bitlik adres 2ⁿ kelimeden birini seçer.'),
      t('In Verilog: logic [3:0] mem [0:7]; — or one register per word.', "Verilog'da: logic [3:0] mem [0:7]; — ya da her kelime için bir yazmaç."),
    ],
    actions: [
      { kind: 'gates', preset: 'reg_counter', label: t('Register counter with buses', 'Bus ile yazmaçlı sayıcı') },
      { kind: 'gates', preset: 'ram', label: t('Write and read a RAM', "RAM'e yaz ve oku") },
      { kind: 'exercise', id: 'counter4', label: t('Exercise: 4-bit counter', 'Alıştırma: 4 bitlik sayıcı') },
    ],
    quiz: [
      { q: t('How many words does a RAM with a 3-bit address hold?', '3 bitlik adresi olan bir RAM kaç kelime tutar?'), options: [t('3', '3'), t('6', '6'), t('8', '8')], answer: 2, why: t('2³ = 8 addresses.', '2³ = 8 adres.') },
      { q: t('When does a register with enable load its input?', 'Yetkili bir yazmaç girişini ne zaman yükler?'), options: [t('Whenever the input changes', 'Giriş her değiştiğinde'), t('On a rising clock edge while enable is 1', 'Yetki 1 iken saatin yükselen kenarında'), t('When enable goes to 0', 'Yetki 0 olduğunda')], answer: 1, why: t('Clocked and enabled: both conditions are needed.', 'Saatli ve yetkili: iki koşul da gerekir.') },
    ],
  },
  {
    id: 'fsm',
    title: t('Finite state machines', 'Sonlu durum makineleri'),
    summary: t('Designing control logic as states and transitions.', 'Kontrol mantığını durumlar ve geçişler olarak tasarlamak.'),
    body: [
      t('A finite state machine (FSM) is a register holding the current state plus logic that picks the next state from the current state and the inputs. Traffic lights, vending machines and protocol controllers are FSMs.',
        'Sonlu durum makinesi (FSM), o anki durumu tutan bir yazmaç ile o anki duruma ve girişlere göre sonraki durumu seçen mantıktan oluşur. Trafik ışıkları, otomatlar ve protokol denetleyicileri birer FSM\'dir.'),
      t('In a Moore machine the outputs depend only on the state; in a Mealy machine they also depend on the inputs. In Verilog a case (state) statement lists what happens in each state.',
        "Moore makinesinde çıkışlar yalnızca duruma, Mealy makinesinde girişlere de bağlıdır. Verilog'da case (state) ifadesi her durumda ne olacağını listeler."),
      t('Compile an FSM on the DE2 page and open the FSM tab: the state diagram is drawn from your code and the current state lights up as the board runs.',
        'DE2 sayfasında bir FSM derleyip FSM sekmesini aç: durum diyagramı kodundan çizilir ve kart çalışırken o anki durum yanar.'),
    ],
    points: [
      t('Name states with localparam or enum.', "Durumları localparam veya enum ile adlandır."),
      t('Always define a reset state.', 'Her zaman bir reset durumu tanımla.'),
    ],
    actions: [
      { kind: 'exercise', id: 'seq101', label: t('Exercise: "101" sequence detector', 'Alıştırma: "101" dizi dedektörü') },
      { kind: 'exercise', id: 'edge_detect', label: t('Exercise: edge detector', 'Alıştırma: kenar dedektörü') },
      { kind: 'fsm', preset: 'seq1011', label: t('Draw it: 1011 detector (Mealy)', 'Çizerek dene: 1011 dedektörü (Mealy)') },
      { kind: 'fsm', preset: 'traffic', label: t('Draw it: traffic light (Moore)', 'Çizerek dene: trafik ışığı (Moore)') },
    ],
    quiz: [
      { q: t('In a Moore machine the outputs depend on…', 'Moore makinesinde çıkışlar neye bağlıdır?'), options: [t('only the current state', 'yalnızca o anki duruma'), t('the state and the inputs', 'duruma ve girişlere'), t('only the inputs', 'yalnızca girişlere')], answer: 0, why: t('That is the definition of a Moore machine.', 'Moore makinesinin tanımı budur.') },
      { q: t('How many flip-flops encode 5 states in binary?', '5 durumu ikilik kodlamak için kaç flip-flop gerekir?'), options: [t('2', '2'), t('3', '3'), t('5', '5')], answer: 1, why: t('2 bits give 4 states, 3 bits give 8.', '2 bit 4 durum, 3 bit 8 durum verir.') },
    ],
  },
  {
    id: 'timing',
    title: t('Propagation delay and glitches', 'Yayılım gecikmesi ve glitch'),
    summary: t('Why real circuits are not instant, and why we clock them.', 'Gerçek devreler neden anlık değildir ve neden saatle çalıştırılır.'),
    body: [
      t('Every real gate needs a little time — its propagation delay — before its output follows a change at its inputs. Signals travelling along paths of different length arrive at different times.',
        'Her gerçek kapının, girişindeki bir değişikliği çıkışına yansıtması için biraz zamana (yayılım gecikmesine) ihtiyacı vardır. Farklı uzunluktaki yollardan gelen sinyaller farklı zamanlarda ulaşır.'),
      t('Because of this, an output that should stay constant can briefly flip — a glitch, caused by a hazard in the logic. In y = a·b + a\'·c with b = c = 1, y should stay 1 when a falls, but for a moment both AND gates output 0.',
        "Bu yüzden sabit kalması gereken bir çıkış kısa süreliğine değişebilir: mantıktaki bir tehlikenin (hazard) yol açtığı glitch. y = a·b + a'·c devresinde b = c = 1 iken a düştüğünde y'nin 1 kalması gerekir, ama bir an için iki VE kapısı da 0 verir."),
      t('Synchronous design avoids the problem: flip-flops sample signals only at the clock edge, after everything has settled. The clock period must be longer than the slowest path.',
        'Senkron tasarım sorunu önler: flip-flop\'lar sinyalleri yalnızca saat kenarında, her şey yerine oturduktan sonra örnekler. Saat periyodu en yavaş yoldan uzun olmalıdır.'),
    ],
    points: [
      t('A redundant term (here b·c) removes a static hazard.', 'Fazladan bir terim (burada b·c) statik tehlikeyi giderir.'),
      t('Never use a combinational signal that may glitch as a clock.', 'Glitch yapabilecek kombinasyonel bir sinyali asla saat olarak kullanma.'),
    ],
    actions: [
      { kind: 'gates', preset: 'hazard', label: t('See the glitch with gate delays', 'Glitch\'i kapı gecikmeleriyle gör') },
    ],
    quiz: [
      { q: t('What causes a glitch?', 'Glitch\'e ne yol açar?'), options: [t('Signals arriving at different times over paths with different delays', 'Farklı gecikmeli yollardan farklı zamanlarda gelen sinyaller'), t('A wrong truth table', 'Yanlış bir doğruluk tablosu'), t('Too many inputs', 'Fazla giriş')], answer: 0, why: t('The logic is correct; the timing is not uniform.', 'Mantık doğrudur; zamanlama eşit değildir.') },
      { q: t('How does synchronous design deal with glitches?', 'Senkron tasarım glitch\'lerle nasıl başa çıkar?'), options: [t('It removes all delays', 'Tüm gecikmeleri kaldırır'), t('It samples only at clock edges, after signals settle', 'Sinyaller oturduktan sonra yalnızca saat kenarında örnekler'), t('It uses more XOR gates', 'Daha fazla XOR kapısı kullanır')], answer: 1, why: t('A glitch that is over before the edge is never seen.', 'Kenardan önce biten bir glitch hiç görülmez.') },
    ],
  },
];
