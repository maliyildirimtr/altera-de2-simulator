// DE2 LCD Custom Characters
//
// Goes one step past "hello": defines two custom glyphs in CGRAM, shows the
// switches live in hexadecimal and scrolls the display with the buttons.
//
//   line 1   SW=0x?????      (SW17..SW0, rewritten continuously)
//   line 2   <heart> LOGIC LAB <smiley>
//
//   KEY0  restart the whole sequence (active-low)
//   KEY1  scroll the display left   (command 0x18)
//   KEY2  scroll the display right  (command 0x1C)
//   KEY3  return home, unscrolled   (command 0x02)
//
// ── Custom characters ───────────────────────────────────────────────────
// Command 0x40 | addr points the address counter at CGRAM instead of DDRAM.
// Each following data byte is one pixel row (low five bits, top row first),
// eight rows per glyph, so glyph n lives at CGRAM 8n..8n+7. Writing the byte
// n to DDRAM then shows that glyph. A "set DDRAM address" command switches
// the counter back to the display memory.
//
// ── Scrolling ───────────────────────────────────────────────────────────
// Command 0001 SR00 with S=1 shifts the whole display (both lines move
// together); R picks the direction. Each line is 40 characters long inside
// the controller, so text scrolled off one edge comes back on the other.
//
// Like de2_lcd_hello, each byte takes two clock cycles (EN high, then low):
// the HD44780 latches on the falling edge. Timing waits are left out because
// the simulated controller is functional rather than timed.

module de2_lcd_custom (
    input  logic CLOCK_50,
    input  logic KEY0,
    input  logic KEY1,
    input  logic KEY2,
    input  logic KEY3,
    input  logic SW0,
    input  logic SW1,
    input  logic SW2,
    input  logic SW3,
    input  logic SW4,
    input  logic SW5,
    input  logic SW6,
    input  logic SW7,
    input  logic SW8,
    input  logic SW9,
    input  logic SW10,
    input  logic SW11,
    input  logic SW12,
    input  logic SW13,
    input  logic SW14,
    input  logic SW15,
    input  logic SW16,
    input  logic SW17,
    output logic LCD_EN,
    output logic LCD_RS,
    output logic LCD_RW,
    output logic LCD_ON,
    output logic LCD_BLON,
    output logic LCD_DATA0,
    output logic LCD_DATA1,
    output logic LCD_DATA2,
    output logic LCD_DATA3,
    output logic LCD_DATA4,
    output logic LCD_DATA5,
    output logic LCD_DATA6,
    output logic LCD_DATA7
);

    // Bytes 35..46 repeat forever; bytes 0..34 run once.
    localparam int LOOP_STEP = 70;
    localparam int LAST_STEP = 93;

    logic [6:0] step;

    always_ff @(posedge CLOCK_50) begin
        if (~KEY0) begin
            step <= 7'd0;
        end else if (step == LAST_STEP) begin
            step <= LOOP_STEP;
        end else begin
            step <= step + 7'd1;
        end
    end

    logic [5:0] index;
    assign index = step[6:1];

    // EN high on even steps, low on odd steps: one falling edge per byte.
    assign LCD_EN = ~step[0];

    // ── The hex digit being written, and its ASCII code ─────────────────
    logic [3:0] nibble;
    always_comb begin
        case (index)
            6'd41: nibble = {2'b00, SW17, SW16};
            6'd42: nibble = {SW15, SW14, SW13, SW12};
            6'd43: nibble = {SW11, SW10, SW9, SW8};
            6'd44: nibble = {SW7, SW6, SW5, SW4};
            default: nibble = {SW3, SW2, SW1, SW0};
        endcase
    end

    logic [7:0] hex_ascii;
    // '0'..'9' are 0x30..0x39, 'A'..'F' are 0x41..0x46.
    assign hex_ascii = (nibble < 4'd10) ? (8'h30 + {4'b0000, nibble}) : (8'h37 + {4'b0000, nibble});

    // ── Scroll command from the buttons (all active-low) ────────────────
    //   0x18 shift display left, 0x1C shift display right, 0x02 return
    //   home, 0x00 no command.
    logic [7:0] scroll_cmd;
    assign scroll_cmd = (~KEY1) ? 8'h18 :
                        (~KEY2) ? 8'h1C :
                        (~KEY3) ? 8'h02 : 8'h00;

    logic       rs;
    logic [7:0] data;

    always_comb begin
        case (index)
            6'd0:  begin rs = 1'b0; data = 8'h38; end  // 8-bit, 2 line
            6'd1:  begin rs = 1'b0; data = 8'h0C; end  // display on, cursor off
            6'd2:  begin rs = 1'b0; data = 8'h06; end  // entry mode: increment
            6'd3:  begin rs = 1'b0; data = 8'h01; end  // clear display
            // ── Custom glyphs: CGRAM address 0, eight rows per glyph ────
            6'd4:  begin rs = 1'b0; data = 8'h40; end  // CGRAM address 0 (glyph 0)
            6'd5:  begin rs = 1'b1; data = 8'b00000000; end  // glyph 0: heart
            6'd6:  begin rs = 1'b1; data = 8'b00001010; end  // glyph 0: heart
            6'd7:  begin rs = 1'b1; data = 8'b00011111; end  // glyph 0: heart
            6'd8:  begin rs = 1'b1; data = 8'b00011111; end  // glyph 0: heart
            6'd9:  begin rs = 1'b1; data = 8'b00011111; end  // glyph 0: heart
            6'd10: begin rs = 1'b1; data = 8'b00001110; end  // glyph 0: heart
            6'd11: begin rs = 1'b1; data = 8'b00000100; end  // glyph 0: heart
            6'd12: begin rs = 1'b1; data = 8'b00000000; end  // glyph 0: heart
            6'd13: begin rs = 1'b1; data = 8'b00000000; end  // glyph 1: smiley
            6'd14: begin rs = 1'b1; data = 8'b00001010; end  // glyph 1: smiley
            6'd15: begin rs = 1'b1; data = 8'b00001010; end  // glyph 1: smiley
            6'd16: begin rs = 1'b1; data = 8'b00000000; end  // glyph 1: smiley
            6'd17: begin rs = 1'b1; data = 8'b00010001; end  // glyph 1: smiley
            6'd18: begin rs = 1'b1; data = 8'b00001110; end  // glyph 1: smiley
            6'd19: begin rs = 1'b1; data = 8'b00000000; end  // glyph 1: smiley
            6'd20: begin rs = 1'b1; data = 8'b00000000; end  // glyph 1: smiley
            // ── Line 2: <heart> LOGIC LAB <smiley> ──────────────────────
            6'd21: begin rs = 1'b0; data = 8'hC0; end  // DDRAM 0x40 = line 2 (also leaves CGRAM mode)
            6'd22: begin rs = 1'b1; data = 8'h00; end  // glyph 0
            6'd23: begin rs = 1'b1; data = 8'h20; end  // space
            6'd24: begin rs = 1'b1; data = 8'h4C; end  // 'L'
            6'd25: begin rs = 1'b1; data = 8'h4F; end  // 'O'
            6'd26: begin rs = 1'b1; data = 8'h47; end  // 'G'
            6'd27: begin rs = 1'b1; data = 8'h49; end  // 'I'
            6'd28: begin rs = 1'b1; data = 8'h43; end  // 'C'
            6'd29: begin rs = 1'b1; data = 8'h20; end  // space
            6'd30: begin rs = 1'b1; data = 8'h4C; end  // 'L'
            6'd31: begin rs = 1'b1; data = 8'h41; end  // 'A'
            6'd32: begin rs = 1'b1; data = 8'h42; end  // 'B'
            6'd33: begin rs = 1'b1; data = 8'h20; end  // space
            6'd34: begin rs = 1'b1; data = 8'h01; end  // glyph 1
            // ── Refresh loop: line 1 shows SW[17:0] in hex ──────────────
            6'd35: begin rs = 1'b0; data = 8'h80; end  // DDRAM 0x00 = line 1
            6'd36: begin rs = 1'b1; data = 8'h53; end  // 'S'
            6'd37: begin rs = 1'b1; data = 8'h57; end  // 'W'
            6'd38: begin rs = 1'b1; data = 8'h3D; end  // '='
            6'd39: begin rs = 1'b1; data = 8'h30; end  // '0'
            6'd40: begin rs = 1'b1; data = 8'h78; end  // 'x'
            6'd41: begin rs = 1'b1; data = hex_ascii; end  // hex digit 4
            6'd42: begin rs = 1'b1; data = hex_ascii; end  // hex digit 3
            6'd43: begin rs = 1'b1; data = hex_ascii; end  // hex digit 2
            6'd44: begin rs = 1'b1; data = hex_ascii; end  // hex digit 1
            6'd45: begin rs = 1'b1; data = hex_ascii; end  // hex digit 0
            6'd46: begin rs = 1'b0; data = scroll_cmd; end  // KEY1/KEY2/KEY3: scroll left/right/home
            default: begin rs = 1'b0; data = 8'h00; end
        endcase
    end

    assign LCD_RS    = rs;
    assign LCD_RW    = 1'b0;   // write only
    assign LCD_ON    = 1'b1;
    assign LCD_BLON  = 1'b1;

    assign LCD_DATA0 = data[0];
    assign LCD_DATA1 = data[1];
    assign LCD_DATA2 = data[2];
    assign LCD_DATA3 = data[3];
    assign LCD_DATA4 = data[4];
    assign LCD_DATA5 = data[5];
    assign LCD_DATA6 = data[6];
    assign LCD_DATA7 = data[7];

endmodule
