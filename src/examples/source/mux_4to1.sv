module mux_4to1 (
    input  logic       d0,
    input  logic       d1,
    input  logic       d2,
    input  logic       d3,
    input  logic [1:0] sel,
    output logic       y
);

assign y = (sel == 2'b00) ? d0 :
           (sel == 2'b01) ? d1 :
           (sel == 2'b10) ? d2 : d3;

endmodule
