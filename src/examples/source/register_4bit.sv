module register_4bit (
    input  logic       clk,
    input  logic       reset,
    input  logic       load,
    input  logic [3:0] d,
    output logic [3:0] q
);

always_ff @(posedge clk) begin
    if (reset)
        q <= 4'b0000;
    else if (load)
        q <= d;
end

endmodule
