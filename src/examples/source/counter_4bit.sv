module counter_4bit (
    input  logic       clk,
    input  logic       reset,
    output logic [3:0] count
);

always_ff @(posedge clk) begin
    if (reset)
        count <= 4'b0000;
    else
        count <= count + 4'b0001;
end

endmodule
