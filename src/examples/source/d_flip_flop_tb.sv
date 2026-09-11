`timescale 1ns/1ps

module d_flip_flop_tb;

logic clk;
logic reset;
logic d;
logic q;

d_flip_flop uut (
    .clk(clk),
    .reset(reset),
    .d(d),
    .q(q)
);

always #5 clk = ~clk;

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, d_flip_flop_tb);

    clk = 0;
    reset = 1;
    d = 0;
    #15;

    reset = 0;
    d = 1; #10;
    d = 0; #10;
    d = 1; #10;
    reset = 1; #10;

    $finish;
end

endmodule
