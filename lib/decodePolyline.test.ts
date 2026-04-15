import { decodeEncodedPolyline } from "@/lib/decodePolyline";

describe("decodeEncodedPolyline", () => {
  it("decodes known polyline into points", () => {
    const decoded = decodeEncodedPolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(decoded).toHaveLength(3);
    expect(decoded[0].lat).toBeCloseTo(38.5, 5);
    expect(decoded[0].lng).toBeCloseTo(-120.2, 5);
    expect(decoded[2].lat).toBeCloseTo(43.252, 5);
    expect(decoded[2].lng).toBeCloseTo(-126.453, 5);
  });
});
