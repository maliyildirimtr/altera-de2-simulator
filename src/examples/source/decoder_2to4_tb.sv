`timescale 1ns/1ps

module decoder_2to4_tb;

logic [1:0] a;
logic       en;
logic [3:0] y;

decoder_2to4 uut (
    .a(a),
    .en(en),
    .y(y)
);

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, decoder_2to4_tb);

    en = 0; a = 2'b00; #10;
    en = 1; a = 2'b00; #10;
    en = 1; a = 2'b01; #10;
    en = 1; a = 2'b10; #10;
    en = 1; a = 2'b11; #10;

    $finish;
end

endmodule
