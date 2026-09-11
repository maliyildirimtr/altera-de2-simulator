module counter_4bit_de2 (
    input  logic CLOCK_50,
    input  logic KEY0,
    output logic LEDR0,
    output logic LEDR1,
    output logic LEDR2,
    output logic LEDR3
);

logic [3:0] count_reg;

always_ff @(posedge CLOCK_50) begin
    if (~KEY0) begin
        count_reg <= 4'b0000;
    end else begin
        count_reg <= count_reg + 1'b1;
    end
end

assign LEDR0 = count_reg[0];
assign LEDR1 = count_reg[1];
assign LEDR2 = count_reg[2];
assign LEDR3 = count_reg[3];

endmodule
