module priority_encoder_4to2 (
    input  logic [3:0] d,
    output logic [1:0] code,
    output logic       valid
);

assign valid = (d != 4'b0000);

assign code = d[3] ? 2'b11 :
              d[2] ? 2'b10 :
              d[1] ? 2'b01 : 2'b00;

endmodule
