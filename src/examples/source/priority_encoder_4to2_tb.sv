`timescale 1ns/1ps

module priority_encoder_4to2_tb;

logic [3:0] d;
logic [1:0] code;
logic       valid;

priority_encoder_4to2 uut (
    .d(d),
    .code(code),
    .valid(valid)
);

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, priority_encoder_4to2_tb);

    d = 4'b0000; #10; // valid=0
    d = 4'b0001; #10; // valid=1, code=00
    d = 4'b0010; #10; // valid=1, code=01
    d = 4'b0100; #10; // valid=1, code=10
    d = 4'b1000; #10; // valid=1, code=11
    d = 4'b1011; #10; // valid=1, code=11 (highest bit priority)

    $finish;
end

endmodule
