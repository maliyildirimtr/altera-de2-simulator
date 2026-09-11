`timescale 1ns/1ps

module basic_gates_tb;

logic a;
logic b;
logic y_and;
logic y_or;
logic y_xor;
logic y_not;
logic y_nand;
logic y_nor;

basic_gates uut (
    .a(a),
    .b(b),
    .y_and(y_and),
    .y_or(y_or),
    .y_xor(y_xor),
    .y_not(y_not),
    .y_nand(y_nand),
    .y_nor(y_nor)
);

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, basic_gates_tb);

    a = 0; b = 0; #10;
    a = 0; b = 1; #10;
    a = 1; b = 0; #10;
    a = 1; b = 1; #10;

    $finish;
end

endmodule
