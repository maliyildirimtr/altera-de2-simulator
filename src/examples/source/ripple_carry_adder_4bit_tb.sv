`timescale 1ns/1ps

module ripple_carry_adder_4bit_tb;

logic [3:0] a;
logic [3:0] b;
logic       cin;
logic [3:0] sum;
logic       cout;

ripple_carry_adder_4bit uut (
    .a(a),
    .b(b),
    .cin(cin),
    .sum(sum),
    .cout(cout)
);

initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, ripple_carry_adder_4bit_tb);

    a = 4'b0011; b = 4'b0101; cin = 0; #10; // 3 + 5 = 8 (cout=0)
    a = 4'b1111; b = 4'b0001; cin = 0; #10; // 15 + 1 = 0 (cout=1)
    a = 4'b1010; b = 4'b0101; cin = 1; #10; // 10 + 5 + 1 = 16 (cout=1)
    a = 4'b0000; b = 4'b0000; cin = 0; #10;

    $finish;
end

endmodule
