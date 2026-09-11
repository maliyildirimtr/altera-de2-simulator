`timescale 1ns/1ps

module alu_2bit_tb;

logic [1:0] a;
logic [1:0] b;
logic [1:0] op;
logic [1:0] result;
logic       carry;

alu_2bit uut (
    .a(a),
    .b(b),
    .op(op),
    .result(result),
    .carry(carry)
);

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, alu_2bit_tb);

    a = 2'b10; b = 2'b01;

    op = 2'b00; #10; // ADD: 2 + 1 = 3 (result=11, carry=0)
    op = 2'b01; #10; // AND: 2 & 1 = 0 (result=00)
    op = 2'b10; #10; // OR:  2 | 1 = 3 (result=11)
    op = 2'b11; #10; // XOR: 2 ^ 1 = 3 (result=11)

    a = 2'b11; b = 2'b01;
    op = 2'b00; #10; // ADD: 3 + 1 = 4 (result=00, carry=1)

    $finish;
end

endmodule
