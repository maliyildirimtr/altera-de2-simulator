`timescale 1ns/1ps

module register_4bit_tb;

logic       clk;
logic       reset;
logic       load;
logic [3:0] d;
logic [3:0] q;

register_4bit uut (
    .clk(clk),
    .reset(reset),
    .load(load),
    .d(d),
    .q(q)
);

always #5 clk = ~clk;

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, register_4bit_tb);

    clk = 0;
    reset = 1;
    load = 0;
    d = 4'b0000;
    #15;

    reset = 0;
    d = 4'b1010;
    load = 1; #10; // Load 1010

    load = 0;
    d = 4'b1111; #20; // Hold value 1010

    load = 1;
    d = 4'b0101; #10; // Load 0101

    reset = 1; #10; // Synchronous reset

    $finish;
end

endmodule
