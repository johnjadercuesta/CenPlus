import { describe, it, expect } from "vitest";
import { parseCedulaPdf417Bytes } from "@/lib/cedula";

function buildTraditionalPayload(): Uint8Array {
  const fields = [
    "\u0001\u000226497872",
    "PubDSK_1",
    "366525",
    "1150940755VALENCIA",
    "BENITEZ",
    "DAYFENIX",
    "1F19910729110010A+",
  ];

  return new TextEncoder().encode(fields.join("\u0000"));
}

describe("parseCedulaPdf417Bytes", () => {
  it("extrae los datos de una cédula tradicional sin segundo nombre", () => {
    const data = parseCedulaPdf417Bytes(buildTraditionalPayload());

    expect(data).not.toBeNull();
    expect(data?.cedula).toBe("1150940755");
    expect(data?.nombre).toBe("DAYFENIX VALENCIA BENITEZ");
    expect(data?.sexo).toBe("Femenino");
    expect(data?.fechaNacimiento?.getFullYear()).toBe(1991);
    expect(data?.fechaNacimiento?.getMonth()).toBe(6);
    expect(data?.fechaNacimiento?.getDate()).toBe(29);
    expect(data?.bloodType).toBe("A+");
    expect(data?.source).toBe("pdf417");
  });

  it("conserva el segundo nombre cuando está presente", () => {
    const fields = [
      "\u0001\u000226497872",
      "PubDSK_1",
      "366525",
      "1150940755VALENCIA",
      "BENITEZ",
      "DAYFENIX",
      "JOSE",
      "1M19800101110010O-",
    ];

    const data = parseCedulaPdf417Bytes(new TextEncoder().encode(fields.join("\u0000")));

    expect(data?.nombre).toBe("DAYFENIX JOSE VALENCIA BENITEZ");
    expect(data?.sexo).toBe("Masculino");
    expect(data?.fechaNacimiento?.getFullYear()).toBe(1980);
    expect(data?.bloodType).toBe("O-");
  });
});
