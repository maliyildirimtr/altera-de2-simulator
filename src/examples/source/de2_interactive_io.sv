// DE2 Interactive I/O Demo
//
// A tour of the board's simulated I/O in one small design. Nothing here is
// clever; the point is that every DE2 control does something visible, so the
// interactive board can be exercised end to end.
//
//   SW3..SW0   -> LEDR3..LEDR0   direct switch-to-LED mirror
//   SW7..SW4   -> HEX0           hexadecimal digit, active-low segments
//   KEY0       -> LEDG0          active-low button, shown as active-high LED
//   KEY1       -> LEDG1
//   CLOCK_50   -> LEDR17         slow blink, so a running clock is visible
//
// Active-low reminders, both of which catch people out on real hardware:
//   KEY[i]     is 0 while the button is held.
//   HEX0[s]    is 0 for a LIT segment, segment order s = A,B,C,D,E,F,G.

module de2_interactive_io (
    input  logic CLOCK_50,
    input  logic KEY0,
    input  logic KEY1,
    input  logic SW0,
    input  logic SW1,
    input  logic SW2,
    input  logic SW3,
    input  logic SW4,
    input  logic SW5,
    input  logic SW6,
    input  logic SW7,
    output logic LEDR0,
    output logic LEDR1,
    output logic LEDR2,
    output logic LEDR3,
    output logic LEDR17,
    output logic LEDG0,
    output logic LEDG1,
    output logic HEX0_0,
    output logic HEX0_1,
    output logic HEX0_2,
    output logic HEX0_3,
    output logic HEX0_4,
    output logic HEX0_5,
    output logic HEX0_6
);

    // ── Switches straight through to the red LEDs ────────────────────────
    assign LEDR0 = SW0;
    assign LEDR1 = SW1;
    assign LEDR2 = SW2;
    assign LEDR3 = SW3;

    // ── Buttons to the green LEDs ───────────────────────────────────────
    // KEY is active-low, so invert to get "pressed = lit".
    assign LEDG0 = ~KEY0;
    assign LEDG1 = ~KEY1;

    // ── A visible heartbeat on LEDR17 ───────────────────────────────────
    logic [23:0] tick;
    always_ff @(posedge CLOCK_50) begin
        tick <= tick + 24'd1;
    end
    assign LEDR17 = tick[23];

    // ── SW7..SW4 as a hexadecimal digit on HEX0 ─────────────────────────
    logic [3:0] nibble;
    assign nibble = {SW7, SW6, SW5, SW4};

    // Segment patterns are ACTIVE-LOW: a 0 bit lights that segment.
    // Bit order below is {G,F,E,D,C,B,A}.
    logic [6:0] seg;
    always_comb begin
        case (nibble)
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
            4'hF: seg = 7'b0001110;
            default: seg = 7'b1111111;
        endcase
    end

    assign HEX0_0 = seg[0];
    assign HEX0_1 = seg[1];
    assign HEX0_2 = seg[2];
    assign HEX0_3 = seg[3];
    assign HEX0_4 = seg[4];
    assign HEX0_5 = seg[5];
    assign HEX0_6 = seg[6];

endmodule
