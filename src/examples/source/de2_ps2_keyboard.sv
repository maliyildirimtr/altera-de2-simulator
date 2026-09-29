// DE2 PS/2 Keyboard
//
// Receives scan codes from a PS/2 keyboard and shows them on the board:
//
//   HEX1..HEX0  the last byte received, in hexadecimal
//   HEX3..HEX2  the byte before it (F0 means "key released")
//   LEDG0       lit while a key is held down
//   LEDR7..0    the last byte in binary
//   KEY0        clear (active-low)
//
// ── The PS/2 protocol ───────────────────────────────────────────────────
// The keyboard drives both PS2_CLK and PS2_DAT. Each byte is 11 bits: a start
// bit (0), eight data bits LSB first, an odd parity bit and a stop bit (1).
// The data line is valid on the FALLING edge of PS2_CLK.
//
// PS2_CLK is far slower than CLOCK_50 and not related to it, so the design
// never clocks anything from it. It samples the line with two flip-flops
// (a synchroniser) and looks for a 1 -> 0 change in the synchronised copy.
//
// Open the VGA / PS/2 tab, click the keyboard area and type.

module de2_ps2_keyboard (
    input  logic       CLOCK_50,
    input  logic       KEY0,
    input  logic       PS2_CLK,
    input  logic       PS2_DAT,
    output logic [6:0] HEX0,
    output logic [6:0] HEX1,
    output logic [6:0] HEX2,
    output logic [6:0] HEX3,
    output logic [7:0] LEDR,
    output logic       LEDG0
);
    // Synchronise PS2_CLK and PS2_DAT into the CLOCK_50 domain.
    logic c1, c2, c3;
    logic d1, d2;
    always_ff @(posedge CLOCK_50) begin
        c1 <= PS2_CLK;
        c2 <= c1;
        c3 <= c2;
        d1 <= PS2_DAT;
        d2 <= d1;
    end
    logic fall;
    assign fall = c3 & ~c2;              // PS2_CLK went 1 -> 0

    // Shift in the 11 bits of a frame.
    logic [3:0]  count;
    logic [10:0] frame;
    logic [7:0]  last;
    logic [7:0]  prev;
    logic        held;

    always_ff @(posedge CLOCK_50) begin
        if (!KEY0) begin
            count <= 4'd0;
            frame <= 11'd0;
            last  <= 8'd0;
            prev  <= 8'd0;
            held  <= 1'b0;
        end else if (fall) begin
            frame <= {d2, frame[10:1]};
            if (count == 4'd10) begin
                count <= 4'd0;
                // frame[1] is the start bit after shifting; frame[10:2] data + parity
                prev <= last;
                last <= frame[9:2];
                if (frame[9:2] == 8'hF0) held <= 1'b0;
                else if (last != 8'hF0 && frame[9:2] != 8'hE0) held <= 1'b1;
            end else begin
                count <= count + 4'd1;
            end
        end
    end

    assign LEDR  = last;
    assign LEDG0 = held;

    hex7 h0 (.value(last[3:0]), .seg(HEX0));
    hex7 h1 (.value(last[7:4]), .seg(HEX1));
    hex7 h2 (.value(prev[3:0]), .seg(HEX2));
    hex7 h3 (.value(prev[7:4]), .seg(HEX3));
endmodule

// Hexadecimal digit to an active-low seven-segment pattern (gfedcba).
module hex7 (
    input  logic [3:0] value,
    output logic [6:0] seg
);
    always_comb begin
        case (value)
            4'h0: seg = 7'b1000000;
            4'h1: seg = 7'b1111001;
            4'h2: seg = 7'b0100100;
            4'h3: seg = 7'b0110000;
            4'h4: seg = 7'b0011001;
            4'h5: seg = 7'b0010010;
            4'h6: seg = 7'b0000010;
            4'h7: seg = 7'b1111000;
            4'h8: seg = 7'b0000000;
            4'h9: seg = 7'b0010000;
            4'hA: seg = 7'b0001000;
            4'hB: seg = 7'b0000011;
            4'hC: seg = 7'b1000110;
            4'hD: seg = 7'b0100001;
            4'hE: seg = 7'b0000110;
            default: seg = 7'b0001110;
        endcase
    end
endmodule
