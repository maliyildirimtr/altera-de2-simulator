// DE2 VGA Test Pattern
//
// A 640x480 @ 60 Hz VGA signal, the way the real DE2 drives its ADV7123
// video DAC: a 25 MHz pixel clock (every other CLOCK_50 cycle), horizontal
// and vertical counters, active-low sync pulses and 10 bits per colour.
//
//   SW1..SW0  pattern: 0 colour bars, 1 checkerboard, 2 gradient, 3 frame + cross
//   SW2       invert the colours
//   KEY0      reset the counters (active-low)
//
// ── Timing (pixels / lines) ─────────────────────────────────────────────
//            visible  front porch  sync  back porch  total
//   line       640        16        96       48        800
//   frame      480        10         2       33        525
//
// Open the VGA / PS/2 tab and press "Draw frame": one frame is 800 x 525
// pixel clocks = 840 000 CLOCK_50 cycles, drawn line by line as the beam
// would. The monitor finds lines and frames from the sync pulses alone.

module de2_vga_pattern (
    input  logic       CLOCK_50,
    input  logic       KEY0,
    input  logic [2:0] SW,
    output logic       VGA_CLK,
    output logic       VGA_HS,
    output logic       VGA_VS,
    output logic       VGA_BLANK,
    output logic       VGA_SYNC,
    output logic [9:0] VGA_R,
    output logic [9:0] VGA_G,
    output logic [9:0] VGA_B
);
    logic       pix;      // 25 MHz pixel enable
    logic [9:0] hc;       // 0..799
    logic [9:0] vc;       // 0..524

    always_ff @(posedge CLOCK_50) begin
        if (!KEY0) begin
            pix <= 1'b0;
            hc  <= 10'd0;
            vc  <= 10'd0;
        end else begin
            pix <= ~pix;
            if (pix) begin
                if (hc == 10'd799) begin
                    hc <= 10'd0;
                    if (vc == 10'd524) vc <= 10'd0;
                    else vc <= vc + 10'd1;
                end else begin
                    hc <= hc + 10'd1;
                end
            end
        end
    end

    logic visible;
    assign visible   = (hc < 10'd640) && (vc < 10'd480);
    assign VGA_HS    = ~((hc >= 10'd656) && (hc < 10'd752));
    assign VGA_VS    = ~((vc >= 10'd490) && (vc < 10'd492));
    assign VGA_BLANK = visible;          // active-low blanking: 0 outside the picture
    assign VGA_SYNC  = 1'b0;
    assign VGA_CLK   = pix;

    // Colour of the current pixel, one bit each for red, green and blue.
    logic [2:0] rgb;
    always_comb begin
        case (SW[1:0])
            2'd0: rgb = 3'd7 - hc[9:7];                                   // eight bars
            2'd1: rgb = (hc[5] ^ vc[5]) ? 3'd7 : 3'd0;                     // checkerboard
            2'd2: rgb = {vc[8], hc[8], hc[7]};                             // coarse gradient
            default: rgb = (hc < 10'd4 || hc > 10'd635 || vc < 10'd4 || vc > 10'd475
                            || hc == vc + 10'd80 || hc == 10'd560 - vc) ? 3'd7 : 3'd1;
        endcase
        if (SW[2]) rgb = ~rgb;
    end

    assign VGA_R = (visible && rgb[2]) ? 10'h3FF : 10'd0;
    assign VGA_G = (visible && rgb[1]) ? 10'h3FF : 10'd0;
    assign VGA_B = (visible && rgb[0]) ? 10'h3FF : 10'd0;
endmodule
