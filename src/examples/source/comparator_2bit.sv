module comparator_2bit (
    input  logic [1:0] a,
    input  logic [1:0] b,
    output logic       greater,
    output logic       equal,
    output logic       less
);

assign greater = (a > b);
assign equal   = (a == b);
assign less    = (a < b);

endmodule
