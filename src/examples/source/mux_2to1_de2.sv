module mux_2to1_de2 (
    input  logic SW0,
    input  logic SW1,
    input  logic SW2,
    output logic LEDR0
);

// SW0 = A, SW1 = B, SW2 = SEL
assign LEDR0 = SW2 ? SW1 : SW0;

endmodule
