// DE2 (Cyclone II EP2C35F672C6) and Basys3 Common Pin Dictionary
// Maps physical pin strings to our virtual board components

export const pinDictionary: Record<string, string> = {
  // DE2 Switches (SW17 to SW0)
  'PIN_V2': 'SW[17]', 'PIN_V1': 'SW[16]', 'PIN_U4': 'SW[15]', 'PIN_U3': 'SW[14]',
  'PIN_T7': 'SW[13]', 'PIN_P2': 'SW[12]', 'PIN_P1': 'SW[11]', 'PIN_N1': 'SW[10]',
  'PIN_A13': 'SW[9]', 'PIN_B13': 'SW[8]', 'PIN_C13': 'SW[7]', 'PIN_AC13': 'SW[6]',
  'PIN_AD13': 'SW[5]', 'PIN_AF14': 'SW[4]', 'PIN_AE14': 'SW[3]', 'PIN_P25': 'SW[2]',
  'PIN_N26': 'SW[1]', 'PIN_N25': 'SW[0]',

  // DE2 Buttons (KEY3 to KEY0)
  'PIN_W26': 'KEY[3]', 'PIN_P23': 'KEY[2]', 'PIN_N23': 'KEY[1]', 'PIN_G26': 'KEY[0]',

  // DE2 Red LEDs (LEDR17 to LEDR0)
  'PIN_AD12': 'LEDR[17]', 'PIN_AE12': 'LEDR[16]', 'PIN_AE13': 'LEDR[15]', 'PIN_AF13': 'LEDR[14]',
  'PIN_AE15': 'LEDR[13]', 'PIN_AD15': 'LEDR[12]', 'PIN_AC14': 'LEDR[11]', 'PIN_AA13': 'LEDR[10]',
  'PIN_Y13': 'LEDR[9]', 'PIN_AA14': 'LEDR[8]', 'PIN_AC21': 'LEDR[7]', 'PIN_AD21': 'LEDR[6]',
  'PIN_AD23': 'LEDR[5]', 'PIN_AD22': 'LEDR[4]', 'PIN_AC22': 'LEDR[3]', 'PIN_AB21': 'LEDR[2]',
  'PIN_AF23': 'LEDR[1]', 'PIN_AE23': 'LEDR[0]',

  // DE2 Green LEDs (LEDG8 to LEDG0)
  'PIN_Y12': 'LEDG[8]', 'PIN_Y18': 'LEDG[7]', 'PIN_AA20': 'LEDG[6]', 'PIN_U17': 'LEDG[5]',
  'PIN_U18': 'LEDG[4]', 'PIN_V18': 'LEDG[3]', 'PIN_W19': 'LEDG[2]', 'PIN_AF22': 'LEDG[1]',
  'PIN_AE22': 'LEDG[0]',

  // DE2 Clock
  'PIN_N2': 'CLOCK_50',

  // DE2 HEX Displays (HEX0 to HEX7)
  'PIN_AF10': 'HEX0[0]', 'PIN_AB12': 'HEX0[1]', 'PIN_AC12': 'HEX0[2]', 'PIN_AD11': 'HEX0[3]', 'PIN_AE11': 'HEX0[4]', 'PIN_V14': 'HEX0[5]', 'PIN_V13': 'HEX0[6]',
  'PIN_V20': 'HEX1[0]', 'PIN_V21': 'HEX1[1]', 'PIN_W21': 'HEX1[2]', 'PIN_Y22': 'HEX1[3]', 'PIN_AA24': 'HEX1[4]', 'PIN_AA23': 'HEX1[5]', 'PIN_AB24': 'HEX1[6]',
  'PIN_AB23': 'HEX2[0]', 'PIN_V22': 'HEX2[1]', 'PIN_AC25': 'HEX2[2]', 'PIN_AC26': 'HEX2[3]', 'PIN_AB26': 'HEX2[4]', 'PIN_AB25': 'HEX2[5]', 'PIN_Y24': 'HEX2[6]',
  'PIN_Y23': 'HEX3[0]', 'PIN_AA25': 'HEX3[1]', 'PIN_AA26': 'HEX3[2]', 'PIN_Y26': 'HEX3[3]', 'PIN_Y25': 'HEX3[4]', 'PIN_U22': 'HEX3[5]', 'PIN_W24': 'HEX3[6]',
  'PIN_U9': 'HEX4[0]', 'PIN_U1': 'HEX4[1]', 'PIN_U2': 'HEX4[2]', 'PIN_T4': 'HEX4[3]', 'PIN_R7': 'HEX4[4]', 'PIN_R6': 'HEX4[5]', 'PIN_T3': 'HEX4[6]',
  'PIN_T2': 'HEX5[0]', 'PIN_P6': 'HEX5[1]', 'PIN_P7': 'HEX5[2]', 'PIN_T9': 'HEX5[3]', 'PIN_R5': 'HEX5[4]', 'PIN_R4': 'HEX5[5]', 'PIN_R3': 'HEX5[6]',
  'PIN_R2': 'HEX6[0]', 'PIN_P4': 'HEX6[1]', 'PIN_P3': 'HEX6[2]', 'PIN_M2': 'HEX6[3]', 'PIN_M3': 'HEX6[4]', 'PIN_M5': 'HEX6[5]', 'PIN_M4': 'HEX6[6]',
  'PIN_L3': 'HEX7[0]', 'PIN_L2': 'HEX7[1]', 'PIN_L9': 'HEX7[2]', 'PIN_L6': 'HEX7[3]', 'PIN_L7': 'HEX7[4]', 'PIN_P9': 'HEX7[5]', 'PIN_N9': 'HEX7[6]',
  'R2': 'SW[15]', 'T1': 'SW[14]', 'U1': 'SW[13]', 'W2': 'SW[12]', 'R3': 'SW[11]',
  'T2': 'SW[10]', 'T3': 'SW[9]', 'V2': 'SW[8]', 'W13': 'SW[7]', 'W14': 'SW[6]',
  'V15': 'SW[5]', 'W15': 'SW[4]', 'W17': 'SW[3]', 'W16': 'SW[2]', 'V16': 'SW[1]',
  'V17': 'SW[0]',

  // Basys3 Fallback LEDs (led15 to led0) mapped to DE2 LEDR15 to LEDR0
  'L1': 'LEDR[15]', 'P1': 'LEDR[14]', 'N3': 'LEDR[13]', 'P3': 'LEDR[12]', 'U3': 'LEDR[11]',
  'W3': 'LEDR[10]', 'V3': 'LEDR[9]', 'V13': 'LEDR[8]', 'V14': 'LEDR[7]', 'U14': 'LEDR[6]',
  'U15': 'LEDR[5]', 'W18': 'LEDR[4]', 'V19': 'LEDR[3]', 'U19': 'LEDR[2]', 'E19': 'LEDR[1]',
  'U16': 'LEDR[0]',

  // Basys3 Fallback Buttons mapped to DE2 KEYs
  'U18': 'KEY[0]', // Center -> KEY0
  'T18': 'KEY[1]', // Up -> KEY1
  'W19': 'KEY[2]', // Left -> KEY2 (Wait, W19 is also DE2 LEDG2. In a strict parser this is fine since boards won't mix)
  'T17': 'KEY[3]', // Right -> KEY3
};
