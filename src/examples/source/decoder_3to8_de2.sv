module decoder_3to8_de2 (
    input  logic SW0,
    input  logic SW1,
    input  logic SW2,
    input  logic SW3,
    output logic LEDR0,
    output logic LEDR1,
    output logic LEDR2,
    output logic LEDR3,
    output logic LEDR4,
    output logic LEDR5,
    output logic LEDR6,
    output logic LEDR7
);

// SW0..2 = address, SW3 = EN
assign LEDR0 = SW3 & ~SW2 & ~SW1 & ~SW0;
assign LEDR1 = SW3 & ~SW2 & ~SW1 &  SW0;
assign LEDR2 = SW3 & ~SW2 &  SW1 & ~SW0;
assign LEDR3 = SW3 & ~SW2 &  SW1 &  SW0;
assign LEDR4 = SW3 &  SW2 & ~SW1 & ~SW0;
assign LEDR5 = SW3 &  SW2 & ~SW1 &  SW0;
assign LEDR6 = SW3 &  SW2 &  SW1 & ~SW0;
assign LEDR7 = SW3 &  SW2 &  SW1 &  SW0;

endmodule
