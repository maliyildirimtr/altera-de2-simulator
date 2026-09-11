`timescale 1ns/1ps

module counter_4bit_tb;

logic       clk;
logic       reset;
logic [3:0] count;

counter_4bit uut (
    .clk(clk),
    .reset(reset),
    .count(count)
);

always #5 clk = ~clk;

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, counter_4bit_tb);

    clk = 0;
    reset = 1;
    #15;

    reset = 0;
    #160; // Count through several cycles

    reset = 1;
    #20;

    $finish;
end

endmodule
