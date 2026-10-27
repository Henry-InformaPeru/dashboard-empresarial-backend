import {
  enlacePowerBiLegible,
  extraerEnlacePowerBi,
  validarEnlaceDescarga,
} from './enlacesPeriodo';

// Vínculos de mentira con la forma de los de «Publicar en la web»: https://app.powerbi.com/view?r=<base64url de {"k","t","c"}>
const token = (clave: string) =>
  Buffer.from(
    JSON.stringify({ k: clave, t: 'TENANT-DE-PRUEBA', c: 4 }),
  ).toString('base64url');
const VINCULO = `https://app.powerbi.com/view?r=${token('REPORTE-A')}`;
const OTRO_VINCULO = `https://app.powerbi.com/view?r=${token('REPORTE-B')}`;
const iframe = (src: string, titulo = 'Portfolio') =>
  `<iframe title="${titulo}" width="600" height="373.5" src="${src}" frameborder="0" allowFullScreen="true"></iframe>`;

describe('extraerEnlacePowerBi', () => {
  it('saca el vínculo y el título del HTML «para pegar en un sitio web»', () => {
    const r = extraerEnlacePowerBi(iframe(VINCULO, 'Huancayo'));
    expect(r).toEqual({ ok: true, url: VINCULO, titulo: 'Huancayo' });
  });

  it('acepta el vínculo solo, con espacios o saltos de línea alrededor', () => {
    const r = extraerEnlacePowerBi(`\n  ${VINCULO}  \n`);
    expect(r).toEqual({ ok: true, url: VINCULO, titulo: null });
  });

  it('acepta el mensaje completo que trae el HTML (como lo manda quien publicó el reporte)', () => {
    const r = extraerEnlacePowerBi(
      `Buen día:\nlink para la empresa:\n${iframe(VINCULO)}\n\nGracias`,
    );
    expect(r).toMatchObject({ ok: true, url: VINCULO });
  });

  it('deshace el &amp; del HTML para recuperar la dirección tal cual', () => {
    const r = extraerEnlacePowerBi(
      iframe('https://app.powerbi.com/view?r=ABC123&amp;pageName=Pagina1'),
    );
    expect(r).toMatchObject({
      ok: true,
      url: 'https://app.powerbi.com/view?r=ABC123&pageName=Pagina1',
    });
  });

  it('entiende comillas simples, atributos en otro orden y mayúsculas', () => {
    const r = extraerEnlacePowerBi(
      `<IFRAME width='600' SRC='${VINCULO}' title='Mi reporte'></IFRAME>`,
    );
    expect(r).toEqual({ ok: true, url: VINCULO, titulo: 'Mi reporte' });
  });

  it('no confunde data-src con src', () => {
    const r = extraerEnlacePowerBi(
      `<iframe data-src="https://otro.example/x" src="${VINCULO}"></iframe>`,
    );
    expect(r).toMatchObject({ ok: true, url: VINCULO });
  });

  it('acepta el vínculo y su HTML juntos cuando son el mismo reporte', () => {
    const r = extraerEnlacePowerBi(`${VINCULO}\n${iframe(VINCULO)}`);
    expect(r).toMatchObject({ ok: true, url: VINCULO });
  });

  it('acepta el portal Fabric de Microsoft', () => {
    const fabric = `https://app.fabric.microsoft.com/view?r=${token('F')}`;
    expect(extraerEnlacePowerBi(fabric)).toMatchObject({
      ok: true,
      url: fabric,
    });
  });

  it('rechaza lo que trae dos reportes distintos: elegir uno podría poner el de otra empresa', () => {
    const r = extraerEnlacePowerBi(
      `${iframe(VINCULO, 'Huancayo')}\n${iframe(OTRO_VINCULO, 'Portfolio')}`,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/2 vínculos distintos/);
  });

  it('rechaza un texto vacío o sin vínculo', () => {
    expect(extraerEnlacePowerBi('').ok).toBe(false);
    expect(extraerEnlacePowerBi('   ').ok).toBe(false);
    expect(extraerEnlacePowerBi(undefined).ok).toBe(false);
    expect(
      extraerEnlacePowerBi('Buen día, te mando el reporte mañana').ok,
    ).toBe(false);
  });

  it('rechaza un HTML sin la dirección del reporte', () => {
    const r = extraerEnlacePowerBi('<iframe title="x" width="600"></iframe>');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/src/);
  });

  it('rechaza un vínculo de MEGA con un mensaje que explica el cruce de campos', () => {
    const r = extraerEnlacePowerBi('https://mega.nz/file/AbCdEfGh#clave');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/MEGA/);
  });

  it('rechaza sitios que no son de Power BI, también los que lo imitan', () => {
    for (const malo of [
      'https://ejemplo.com/view?r=1',
      'https://powerbi.com.evil.example/view?r=1',
      'https://app.powerbi.com@evil.example/view?r=1',
      'https://evilpowerbi.com/view?r=1',
    ]) {
      expect(extraerEnlacePowerBi(malo).ok).toBe(false);
    }
  });

  it('rechaza http, javascript: y data:', () => {
    expect(extraerEnlacePowerBi('http://app.powerbi.com/view?r=1').ok).toBe(
      false,
    );
    expect(extraerEnlacePowerBi(iframe('javascript:alert(1)')).ok).toBe(false);
    expect(extraerEnlacePowerBi(iframe('data:text/html,<b>x</b>')).ok).toBe(
      false,
    );
  });

  it('rechaza un vínculo de más de 2048 caracteres', () => {
    const largo = `https://app.powerbi.com/view?r=${'a'.repeat(2100)}`;
    expect(extraerEnlacePowerBi(largo).ok).toBe(false);
  });
});

describe('validarEnlaceDescarga', () => {
  it('vacío significa sin descarga', () => {
    expect(validarEnlaceDescarga('')).toEqual({ ok: true, url: null });
    expect(validarEnlaceDescarga('   ')).toEqual({ ok: true, url: null });
    expect(validarEnlaceDescarga(null)).toEqual({ ok: true, url: null });
    expect(validarEnlaceDescarga(undefined)).toEqual({ ok: true, url: null });
  });

  it('conserva el vínculo de MEGA completo, con la clave después del #', () => {
    for (const mega of [
      'https://mega.nz/file/AbCdEfGh#kLmNoPqRsTuVwXyZ0123456789abcdefghijklmnop',
      'https://mega.nz/folder/AbCdEfGh#kLmNoPqRsTuVwXyZ',
      'https://mega.io/file/AbCdEfGh#clave',
    ]) {
      expect(validarEnlaceDescarga(`  ${mega}\n`)).toEqual({
        ok: true,
        url: mega,
      });
    }
  });

  it('rechaza HTML, espacios, http y direcciones que no son vínculos', () => {
    expect(
      validarEnlaceDescarga('<a href="https://mega.nz/file/x">bajar</a>').ok,
    ).toBe(false);
    expect(validarEnlaceDescarga('https://mega.nz/file/x y').ok).toBe(false);
    expect(validarEnlaceDescarga('http://mega.nz/file/x').ok).toBe(false);
    expect(validarEnlaceDescarga('mega.nz/file/x').ok).toBe(false);
    expect(validarEnlaceDescarga('javascript:alert(1)').ok).toBe(false);
  });

  it('rechaza el vínculo de Power BI puesto en el campo de la descarga', () => {
    const r = validarEnlaceDescarga(VINCULO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/Power BI/);
  });
});

describe('enlacePowerBiLegible', () => {
  it('devuelve solo el vínculo cuando lo guardado es el HTML completo', () => {
    expect(enlacePowerBiLegible(iframe(VINCULO))).toBe(VINCULO);
  });

  it('deja igual un vínculo normal y lo que no se puede arreglar', () => {
    expect(enlacePowerBiLegible(VINCULO)).toBe(VINCULO);
    expect(enlacePowerBiLegible('<iframe title="x"></iframe>')).toBe(
      '<iframe title="x"></iframe>',
    );
  });
});
