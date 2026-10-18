// Crea (o restablece) una cuenta de ADMINISTRADOR GENERAL con una clave aleatoria que se muestra UNA sola vez.
// Corre dentro del contenedor de la API (usa sus mismas variables DB_*):
//   docker exec dashboard-api node scripts/crear-admin.js                            crea 'admin.sulotec'
//   docker exec dashboard-api node scripts/crear-admin.js otro.usuario               crea con otro nombre
//   docker exec dashboard-api node scripts/crear-admin.js admin.sulotec --resetear   clave nueva para una cuenta que ya existe
// No acepta claves por parametro: la clave nunca queda en el historial del terminal.
'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const SALT_ROUNDS = 12; // el mismo costo que usa la API (BcryptPasswordHasher)

function claveAleatoria() {
  // Cumple la politica de la API: 12-72 caracteres con mayuscula, minuscula, numero y simbolo
  const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minusculas = 'abcdefghijkmnopqrstuvwxyz';
  const numeros = '23456789';
  const simbolos = '!#$%*+-=?@^_';
  const elegir = (juego) => juego[crypto.randomInt(juego.length)];
  const caracteres = [
    elegir(mayusculas),
    elegir(minusculas),
    elegir(numeros),
    elegir(simbolos),
  ];
  const todos = mayusculas + minusculas + numeros + simbolos;
  while (caracteres.length < 20) caracteres.push(elegir(todos));
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}

async function main() {
  const args = process.argv.slice(2);
  const resetear = args.includes('--resetear');
  const username = (args.find((a) => !a.startsWith('--')) || 'admin.sulotec')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._-]{3,60}$/.test(username)) {
    throw new Error(
      'El usuario debe tener 3 a 60 caracteres: letras minusculas, numeros, punto, guion o guion bajo.',
    );
  }

  const cliente = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
  });
  await cliente.connect();

  try {
    const existente = await cliente.query(
      'SELECT id_usuario FROM seguridad."Usuarios" WHERE LOWER(username) = $1',
      [username],
    );
    if (existente.rowCount > 0 && !resetear) {
      throw new Error(
        `El usuario '${username}' ya existe. Para darle una clave nueva: node scripts/crear-admin.js ${username} --resetear`,
      );
    }
    if (existente.rowCount === 0 && resetear) {
      throw new Error(
        `El usuario '${username}' no existe: corre el comando sin --resetear para crearlo.`,
      );
    }

    const clave = claveAleatoria();
    const hash = await bcrypt.hash(clave, SALT_ROUNDS);

    if (existente.rowCount > 0) {
      await cliente.query(
        `UPDATE seguridad."Usuarios"
            SET password_hash = $2, estado = 'ACTIVO', id_rol = 1, id_empresa = NULL
          WHERE id_usuario = $1`,
        [existente.rows[0].id_usuario, hash],
      );
    } else {
      await cliente.query(
        `INSERT INTO seguridad."Usuarios" (id_empresa, id_rol, username, nombre_completo, password_hash, estado)
         VALUES (NULL, 1, $1, 'Administrador general Sulotec', $2, 'ACTIVO')`,
        [username, hash],
      );
    }

    console.log('');
    console.log(
      `  Administrador general ${existente.rowCount > 0 ? 'actualizado' : 'creado'}`,
    );
    console.log(`  Usuario: ${username}`);
    console.log(`  Clave:   ${clave}`);
    console.log('');
    console.log(
      '  Guardala AHORA en el gestor de contrasenas: no se vuelve a mostrar ni queda guardada en el servidor.',
    );
    console.log('');
  } finally {
    await cliente.end();
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
