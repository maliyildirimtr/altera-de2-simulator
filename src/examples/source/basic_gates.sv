module basic_gates (
    input  logic a,
    input  logic b,
    output logic y_and,
    output logic y_or,
    output logic y_xor,
    output logic y_not,
    output logic y_nand,
    output logic y_nor
);

assign y_and  = a & b;
assign y_or   = a | b;
assign y_xor  = a ^ b;
assign y_not  = ~a;
assign y_nand = ~(a & b);
assign y_nor  = ~(a | b);

endmodule
