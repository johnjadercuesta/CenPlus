import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const superKeyHeader = request.headers.get("x-super-key");
    const superKeyEnv = process.env.SUPER_ADMIN_KEY;

    if (superKeyEnv && superKeyHeader !== superKeyEnv) {
      return NextResponse.json({ error: "Clave de super admin incorrecta" }, { status: 401 });
    }

    const { tenant } = await request.json();
    if (!tenant) {
      return NextResponse.json({ error: "Organización no especificada" }, { status: 400 });
    }

    // Generamos un token especial de administrador para el tenant solicitado
    // Usamos userId 0 para indicar que es un super admin (impersonate)
    const token = signToken({
      userId: 0,
      email: "superadmin@cenplus",
      nombre: "Super Admin",
      role: "administrador",
      tenant: tenant,
    });

    const response = NextResponse.json({ token, success: true });
    
    // Set cookie para acceso completo en este dominio
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 día
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error en impersonate:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
