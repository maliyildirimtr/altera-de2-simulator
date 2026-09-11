`timescale 1ns/1ps

module decoder_3to8_tb;

logic [2:0] a;
logic       en;
logic [7:0] y;

decoder_3to8 uut (
    .a(a),
    .en(en),
    .y(y)
);

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, decoder_3to8_tb);

    en = 0; a = 3'b000; #10;
    en = 1; a = 3'b000; #10;
    en = 1; a = 3'b001; #10;
    en = 1; a = 3'b010; #10;
    en = 1; a = 3'b011; #10;
    en = 1; a = 3'b100; #10;
    en = 1; a = 3'b101; #10;
    en = 1; a = 3'b110; #10;
    en = 1; a = 3'b111; #10;

    $finish;
end

endmodule
