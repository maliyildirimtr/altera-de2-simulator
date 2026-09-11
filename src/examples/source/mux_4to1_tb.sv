`timescale 1ns/1ps

module mux_4to1_tb;

logic d0;
logic d1;
logic d2;
logic d3;
logic [1:0] sel;
logic y;

mux_4to1 uut (
    .d0(d0),
    .d1(d1),
    .d2(d2),
    .d3(d3),
    .sel(sel),
    .y(y)
);

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, mux_4to1_tb);

    d0 = 1; d1 = 0; d2 = 0; d3 = 0; sel = 2'b00; #10;
    d0 = 0; d1 = 1; d2 = 0; d3 = 0; sel = 2'b01; #10;
    d0 = 0; d1 = 0; d2 = 1; d3 = 0; sel = 2'b10; #10;
    d0 = 0; d1 = 0; d2 = 0; d3 = 1; sel = 2'b11; #10;

    $finish;
end

endmodule
