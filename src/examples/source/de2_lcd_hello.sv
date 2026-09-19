// DE2 LCD Hello
//
// Drives the DE2's 16x2 character LCD through its HD44780 interface and
// writes two lines of text.
//
//   ENGINEERING LAB
//   HELLO FPGA
//
// ── How the bus is driven ───────────────────────────────────────────────
// The HD44780 latches a byte on the FALLING edge of LCD_EN, so each byte
// needs two clock cycles: one with EN high, one with EN low. That is exactly
// what `step[0]` provides — EN is its inverse, so every odd step produces one
// falling edge, and `step[6:1]` is therefore the byte counter.
//
// This is a deliberately plain, fully synchronous sequencer rather than a
// delay-based one. Real HD44780 parts need millisecond waits after "clear"
// and "function set", and a design for real hardware must add them; the
// simulated controller is functional rather than timed, so the sequence is
// what matters here and the timing is left for the hardware exercise.
//
// LCD_RW is tied low: this design only writes. LCD_ON and LCD_BLON are tied
// high to power the panel and its backlight.

module de2_lcd_hello (
    input  logic CLOCK_50,
    input  logic KEY0,
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

    // 31 bytes to send, two clock cycles each.
    localparam int LAST_STEP = 62;

    logic [6:0] step;

    // KEY0 is ACTIVE-LOW: holding it restarts the write sequence.
    always_ff @(posedge CLOCK_50) begin
        if (~KEY0) begin
            step <= 7'd0;
        end else if (step < LAST_STEP) begin
            step <= step + 7'd1;
        end
    end

    logic [5:0] index;
    assign index = step[6:1];

    // EN high on even steps, low on odd steps: one falling edge per byte.
    assign LCD_EN = ~step[0];

    logic       rs;
    logic [7:0] data;

    always_comb begin
        case (index)
            // ── Initialisation ──────────────────────────────────────────
            6'd0:  begin rs = 1'b0; data = 8'h38; end  // 8-bit, 2 line
            6'd1:  begin rs = 1'b0; data = 8'h0C; end  // display on, cursor off
            6'd2:  begin rs = 1'b0; data = 8'h06; end  // entry mode: increment
            6'd3:  begin rs = 1'b0; data = 8'h01; end  // clear display
            6'd4:  begin rs = 1'b0; data = 8'h80; end  // DDRAM address 0x00

            // ── Line 1: "ENGINEERING LAB" ───────────────────────────────
            6'd5:  begin rs = 1'b1; data = 8'h45; end  // E
            6'd6:  begin rs = 1'b1; data = 8'h4E; end  // N
            6'd7:  begin rs = 1'b1; data = 8'h47; end  // G
            6'd8:  begin rs = 1'b1; data = 8'h49; end  // I
            6'd9:  begin rs = 1'b1; data = 8'h4E; end  // N
            6'd10: begin rs = 1'b1; data = 8'h45; end  // E
            6'd11: begin rs = 1'b1; data = 8'h45; end  // E
            6'd12: begin rs = 1'b1; data = 8'h52; end  // R
            6'd13: begin rs = 1'b1; data = 8'h49; end  // I
            6'd14: begin rs = 1'b1; data = 8'h4E; end  // N
            6'd15: begin rs = 1'b1; data = 8'h47; end  // G
            6'd16: begin rs = 1'b1; data = 8'h20; end  // space
            6'd17: begin rs = 1'b1; data = 8'h4C; end  // L
            6'd18: begin rs = 1'b1; data = 8'h41; end  // A
            6'd19: begin rs = 1'b1; data = 8'h42; end  // B

            // ── Move to line 2 (DDRAM 0x40) ─────────────────────────────
            6'd20: begin rs = 1'b0; data = 8'hC0; end

            // ── Line 2: "HELLO FPGA" ────────────────────────────────────
            6'd21: begin rs = 1'b1; data = 8'h48; end  // H
            6'd22: begin rs = 1'b1; data = 8'h45; end  // E
            6'd23: begin rs = 1'b1; data = 8'h4C; end  // L
            6'd24: begin rs = 1'b1; data = 8'h4C; end  // L
            6'd25: begin rs = 1'b1; data = 8'h4F; end  // O
            6'd26: begin rs = 1'b1; data = 8'h20; end  // space
            6'd27: begin rs = 1'b1; data = 8'h46; end  // F
            6'd28: begin rs = 1'b1; data = 8'h50; end  // P
            6'd29: begin rs = 1'b1; data = 8'h47; end  // G
            6'd30: begin rs = 1'b1; data = 8'h41; end  // A

            // Sequence finished: hold a harmless no-op on the bus.
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
