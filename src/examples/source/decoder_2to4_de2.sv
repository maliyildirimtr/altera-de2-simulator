module decoder_2to4_de2 (
    input  logic SW0,
    input  logic SW1,
    input  logic SW2,
    output logic LEDR0,
    output logic LEDR1,
    output logic LEDR2,
    output logic LEDR3
);

// SW0, SW1 = A[0], A[1]; SW2 = EN
assign LEDR0 = SW2 & ~SW1 & ~SW0;
assign LEDR1 = SW2 & ~SW1 &  SW0;
assign LEDR2 = SW2 &  SW1 & ~SW0;
assign LEDR3 = SW2 &  SW1 &  SW0;

endmodule
