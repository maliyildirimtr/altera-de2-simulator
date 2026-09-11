module alu_2bit (
    input  logic [1:0] a,
    input  logic [1:0] b,
    input  logic [1:0] op,
    output logic [1:0] result,
    output logic       carry
);

logic [2:0] sum_extended;
assign sum_extended = a + b;

assign result = (op == 2'b00) ? sum_extended[1:0] :
                (op == 2'b01) ? (a & b) :
                (op == 2'b10) ? (a | b) :
                                (a ^ b);

assign carry = (op == 2'b00) ? sum_extended[2] : 1'b0;

endmodule
