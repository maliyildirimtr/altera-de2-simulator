module full_adder_de2 (
    input  logic SW0,
    input  logic SW1,
    input  logic SW2,
    output logic LEDR0,
    output logic LEDR1
);

assign LEDR0 = SW0 ^ SW1 ^ SW2; // Sum
assign LEDR1 = (SW0 & SW1) | (SW2 & (SW0 ^ SW1)); // Carry

endmodule
