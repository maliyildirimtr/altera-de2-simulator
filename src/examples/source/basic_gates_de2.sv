module basic_gates_de2 (
    input  logic SW0,
    input  logic SW1,
    output logic LEDR0,
    output logic LEDR1,
    output logic LEDR2,
    output logic LEDR3,
    output logic LEDR4,
    output logic LEDR5
);

assign LEDR0 = SW0 & SW1;
assign LEDR1 = SW0 | SW1;
assign LEDR2 = SW0 ^ SW1;
assign LEDR3 = ~SW0;
assign LEDR4 = ~(SW0 & SW1);
assign LEDR5 = ~(SW0 | SW1);

endmodule
