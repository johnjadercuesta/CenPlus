import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { logPasswordChange } from "@/lib/audit";

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Contraseña actual y nueva son obligatorias" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const tenant = token.tenant || getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const { rows } = await queryWithTenant(tenant,
      "SELECT id, password FROM admins WHERE id = $1",
      [token.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const user = rows[0];
    const valid = bcrypt.compareSync(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 401 });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await queryWithTenant(tenant,
      "UPDATE admins SET password = $1 WHERE id = $2",
      [newHash, token.userId]
    );

    await logPasswordChange({
      tenant,
      userId: token.userId,
      userEmail: token.email,
      userName: token.nombre,
    });

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (err: any) {
    console.error("[change-password] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
