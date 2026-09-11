`timescale 1ns/1ps

module comparator_2bit_tb;

logic [1:0] a;
logic [1:0] b;
logic       greater;
logic       equal;
logic       less;

comparator_2bit uut (
    .a(a),
    .b(b),
    .greater(greater),
    .equal(equal),
    .less(less)
);

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, comparator_2bit_tb);

    a = 2'b01; b = 2'b10; #10; // less
    a = 2'b10; b = 2'b10; #10; // equal
    a = 2'b11; b = 2'b01; #10; // greater

    $finish;
end

endmodule
