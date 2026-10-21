import Link from 'next/link';
import { ArrowRight, Building2, Dumbbell, Flame, House, Package } from 'lucide-react';
import './landing.css';

// Server Component a propósito (ver CLAUDE.md): todo el movimiento del landing es
// CSS ligado al scroll en landing.css, sin JavaScript en el cliente.
export default function LandingPage() {
  return (
    <div className="lp dark">
      <div className="progress" aria-hidden="true"></div>

      <header className="nav">
        <div className="wrap">
          <a className="brand" href="#top" aria-label="Forgia, inicio">
            <span className="mark"><Flame size={17} strokeWidth={2.4} color="#0E0F12" aria-hidden="true" /></span>
            Forgia
          </a>
          <nav className="nav-links" aria-label="Principal">
            <a className="link" href="#como">Cómo funciona</a>
            <a className="link" href="#benchmarks">Benchmarks</a>
            <Link className="link" href="/blog">Blog</Link>
            <Link className="link" href="/login">Entrar</Link>
            <Link className="btn btn-primary btn-sm" href="/login">Empezar gratis</Link>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="story" aria-label="Cómo funciona Forgia">
          <div className="wrap story-grid">

            <div className="hero-copy">
              <span className="eyebrow">Coach de CrossFit con IA</span>
              <h1>Tu WOD,<br /><em>forjado</em><br />para ti.</h1>
              <p className="lede">Forgia arma cada entrenamiento con tu nivel, tu equipo, tus records y lo que hiciste las últimas cuatro semanas. Tú solo llegas a entrenar.</p>
              <div className="cta-row">
                <Link className="btn btn-primary" href="/login">Empezar gratis
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="btn btn-ghost" href="#como">Ver cómo funciona</a>
              </div>
              <div className="facts">
                <span>AMRAP · EMOM · For Time · Tabata</span>
                <span>De Novato a Avanzado</span>
                <span>Box, gimnasio o casa</span>
              </div>
            </div>

            <div className="stage">
              <div className="stage-inner">
                <div className="glow" aria-hidden="true"></div>
                <div className="phone" role="img" aria-label="Pantallas de la app Forgia: WOD del día, perfil, balance de estímulos, cargas, modo en vivo, Coach IA y programa mensual">
                  <div className="screen" aria-hidden="true">

                    {/* 0 · WOD del día */}
                    <div className="scr s0">
                      <div className="ph-head">
                        <div><div className="ph-dim">Viernes 9 de octubre</div><div className="ph-h">Buenos días, Ana</div></div>
                        <span className="ph-av">AM</span>
                      </div>
                      <div className="ph-card">
                        <div className="ph-dim">Semana 2 · Volumen · Sesión 4/4</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="ph-title">La Forja</span><span className="mono ph-dim">55 min</span></div>
                        <div className="ph-bar"><i style={{ flex: 10, background: 'var(--amber)' }}></i><i style={{ flex: 15, background: 'var(--blue)' }}></i><i style={{ flex: 14, background: 'var(--red)' }}></i><i style={{ flex: 8, background: 'var(--green)' }}></i></div>
                        <div>
                          <div className="ph-row"><span className="dot" style={{ background: 'var(--amber)' }}></span><span className="grow">Calentamiento</span><span className="val">10&apos;</span></div>
                          <div className="ph-row"><span className="dot" style={{ background: 'var(--blue)' }}></span><span className="grow">Back Squat 5×5</span><span className="val mono">75 kg</span></div>
                          <div className="ph-row"><span className="dot" style={{ background: 'var(--red)' }}></span><span className="grow">AMRAP 14&apos;</span><span className="val">Thruster · T2B · Run</span></div>
                          <div className="ph-row"><span className="dot" style={{ background: 'var(--green)' }}></span><span className="grow">Enfriamiento</span><span className="val">8&apos;</span></div>
                        </div>
                      </div>
                      <div className="ph-card" style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--ember), var(--flare))', flexShrink: '0' }}></span>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Llevas 6 días sin sentadilla pesada. Hoy toca pierna.</span>
                      </div>
                      <div className="ph-cta" style={{ marginTop: 'auto' }}>Empezar</div>
                    </div>

                    {/* 1 · Perfil */}
                    <div className="scr s1">
                      <div className="ph-head"><div><div className="ph-dim">Lo que Forgia sabe de ti</div><div className="ph-h">Tu perfil</div></div><span className="ph-av">AM</span></div>
                      <div className="ph-card">
                        <div className="ph-dim">Nivel y equipo</div>
                        <div className="chips"><span className="chip">Intermedio</span><span className="chip">Box completo</span><span className="chip">4 días/semana</span></div>
                      </div>
                      <div className="ph-card">
                        <div className="ph-dim">Objetivos</div>
                        <div className="chips"><span className="chip">Ganar fuerza</span><span className="chip">Mejorar resistencia</span></div>
                      </div>
                      <div className="ph-card">
                        <div className="ph-dim">Lesiones</div>
                        <div className="chips"><span className="chip warn">Hombro izquierdo: sin kipping</span></div>
                      </div>
                      <div className="ph-card">
                        <div className="ph-dim">Records</div>
                        <div className="ph-row"><span className="grow">Back Squat</span><span className="mono">100 kg</span></div>
                        <div className="ph-row"><span className="grow">Deadlift</span><span className="mono">125 kg</span></div>
                        <div className="ph-row"><span className="grow">Clean</span><span className="mono">65 kg</span></div>
                      </div>
                    </div>

                    {/* 2 · 28 días */}
                    <div className="scr s2">
                      <div className="ph-head"><div><div className="ph-dim">Últimos 28 días</div><div className="ph-h">Balance de estímulos</div></div></div>
                      <div className="ph-card" style={{ alignItems: 'center', padding: '22px 14px' }}>
                        <svg width="190" height="190" viewBox="0 0 80 80" aria-hidden="true">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#26272E" strokeWidth="7"/>
                          <circle className="ring-seg" cx="40" cy="40" r="34" fill="none" stroke="#60A5FA" strokeWidth="7" strokeDasharray="61 213.6" strokeDashoffset="0" transform="rotate(-90 40 40)"/>
                          <circle className="ring-seg" cx="40" cy="40" r="34" fill="none" stroke="#F87171" strokeWidth="7" strokeDasharray="93 213.6" strokeDashoffset="-64.1" transform="rotate(-90 40 40)"/>
                          <circle className="ring-seg" cx="40" cy="40" r="34" fill="none" stroke="#FBBF24" strokeWidth="7" strokeDasharray="29 213.6" strokeDashoffset="-160.2" transform="rotate(-90 40 40)"/>
                          <circle className="ring-seg" cx="40" cy="40" r="34" fill="none" stroke="#34D399" strokeWidth="7" strokeDasharray="18.4 213.6" strokeDashoffset="-192.2" transform="rotate(-90 40 40)"/>
                          <text x="40" y="39" textAnchor="middle" fill="#F2F2F4" style={{ fontFamily: 'var(--display)' }} fontWeight="700" fontSize="14">14</text>
                          <text x="40" y="49" textAnchor="middle" fill="#A3A4AE" style={{ fontFamily: 'var(--body)' }} fontSize="6">sesiones</text>
                        </svg>
                        <div className="legend" style={{ justifyContent: 'center' }}>
                          <span><i style={{ background: 'var(--blue)' }}></i>Fuerza 30%</span>
                          <span><i style={{ background: 'var(--red)' }}></i>Metcon 45%</span>
                          <span><i style={{ background: 'var(--amber)' }}></i>Gimn. 15%</span>
                          <span><i style={{ background: 'var(--green)' }}></i>Cardio 10%</span>
                        </div>
                      </div>
                      <div className="ph-card">
                        <div className="ph-dim" style={{ color: 'var(--ember-soft)' }}>Por qué el WOD de hoy</div>
                        <div style={{ fontSize: '13px', lineHeight: '1.45' }}>Mucho metcon y 6 días sin sentadilla pesada. Hoy sube la fuerza de pierna y el metcon no repite thrusters del martes.</div>
                      </div>
                    </div>

                    {/* 3 · Cargas */}
                    <div className="scr s3">
                      <div className="ph-head"><div><div className="ph-dim">Fuerza · Back Squat</div><div className="ph-h">5×5 al 75%</div></div></div>
                      <div className="ph-card" style={{ gap: '4px' }}>
                        <div className="ph-dim">Tu 1RM registrado</div>
                        <div className="mono" style={{ fontSize: '16px' }}>100 kg · 2 oct</div>
                      </div>
                      <div className="ph-card" style={{ alignItems: 'flex-start', padding: '20px 16px' }}>
                        <div className="ph-dim">Carga de trabajo</div>
                        <div className="big-kg"><span className="kg"><span className="num-static">75</span></span> <small>kg</small></div>
                        <div className="pcts" style={{ width: '100%' }}><span>60</span><span>70</span><span className="on">75</span><span>80</span><span>85</span><span>90</span></div>
                      </div>
                      <div className="ph-card">
                        <div className="ph-row"><span className="grow">Serie 1–5</span><span className="mono">5 reps · 75 kg</span></div>
                        <div className="ph-row"><span className="grow">Descanso</span><span className="mono">2:00</span></div>
                      </div>
                    </div>

                    {/* 4 · En vivo */}
                    <div className="scr s4">
                      <div className="ph-head"><span className="ph-dim">Metcon · AMRAP 14&apos;</span><span className="chip" style={{ fontSize: '11px', padding: '5px 9px' }}>Audio on</span></div>
                      <div className="clock-wrap">
                        <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
                          <defs><linearGradient id="emberArc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EF4444"/><stop offset="1" stopColor="#F97316"/></linearGradient></defs>
                          <circle cx="110" cy="110" r="96" fill="none" stroke="#1F2026" strokeWidth="12"/>
                          <circle className="arc" cx="110" cy="110" r="96" fill="none" stroke="url(#emberArc)" strokeWidth="12" strokeLinecap="round" strokeDasharray="603.2" strokeDashoffset="229" transform="rotate(-90 110 110)"/>
                        </svg>
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span className="clock"><span className="num-static">8:42</span></span>
                          <span className="ph-dim">restantes</span>
                        </div>
                      </div>
                      <div className="stats3">
                        <div><b><span className="rounds"><span className="num-static">4</span></span></b><span>rondas</span></div>
                        <div><b>1:20</b><span>ritmo/ronda</span></div>
                        <div><b style={{ color: 'var(--flare-soft)' }}>10+</b><span>proyección</span></div>
                      </div>
                      <div className="ph-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '54px', height: '54px', borderRadius: '12px', background: 'var(--raised)', border: '1px dashed #4A4B55', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: '10px' }}>Demo</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}><span className="ph-dim" style={{ color: 'var(--ember-soft)' }}>Ahora</span><span style={{ fontFamily: 'var(--display)', fontWeight: '600', fontSize: '17px' }}>12 Toes-to-Bar</span></div>
                      </div>
                      <div className="ph-cta" style={{ marginTop: 'auto', borderRadius: '23px' }}>+1 ronda</div>
                    </div>

                    {/* 5 · Coach IA */}
                    <div className="scr s5">
                      <div className="coach-tag"><span style={{ width: '26px', height: '26px', borderRadius: '13px', background: 'linear-gradient(135deg, var(--ember), var(--flare))' }}></span>Coach IA<span className="ph-dim" style={{ fontWeight: '400' }}>· conoce tu WOD</span></div>
                      <div className="bubbles">
                        <div className="bubble me">¿Cómo escalo los Toes-to-Bar? El hombro me molesta.</div>
                        <div className="bubble coach">Sin kipping hoy. Haz <b>knee raises</b> colgado, estrictos, mismas 12 reps. Si el agarre falla, pasa a V-ups en el piso.</div>
                        <div className="bubble me">¿Y el peso del thruster?</div>
                        <div className="bubble coach"><b>29 kg</b> está bien. Si en la ronda 3 rompes en más de dos series, baja a 24 y mantén el ritmo.</div>
                      </div>
                      <div style={{ marginTop: 'auto', height: '44px', borderRadius: '22px', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 14px', color: 'var(--muted)', fontSize: '12px' }}>Pregúntale al coach…</div>
                    </div>

                    {/* 6 · Programa */}
                    <div className="scr s6">
                      <div className="ph-head"><div><div className="ph-dim">Mesociclo · Octubre</div><div className="ph-h">Tu mes, planeado</div></div></div>
                      <div className="ph-card" style={{ padding: '18px 12px 14px' }}>
                        <svg width="276" height="96" viewBox="0 0 276 96" aria-hidden="true">
                          <line x1="0" y1="86" x2="276" y2="86" stroke="#26272E"/>
                          <polyline className="curve" pathLength="1" strokeDasharray="1" points="30,56 104,36 178,14 252,70" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                          <circle cx="30" cy="56" r="5" fill="#6B6C76"/>
                          <circle cx="104" cy="36" r="7" fill="#DC2626" stroke="#3A1A1C" strokeWidth="5"/>
                          <circle cx="178" cy="14" r="5" fill="#2B2C33" stroke="#4A4B55" strokeWidth="2"/>
                          <circle cx="252" cy="70" r="5" fill="#2B2C33" stroke="#4A4B55" strokeWidth="2"/>
                        </svg>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }}>
                          <span>Base</span><span style={{ color: 'var(--fg)', fontWeight: '600' }}>Volumen</span><span>Intensidad</span><span>Deload</span>
                        </div>
                      </div>
                      <div className="ph-card">
                        <div className="ph-dim">Semana 2</div>
                        <div className="ph-row"><span className="dot" style={{ background: 'var(--green)' }}></span><span className="grow">Metcon</span><span className="val">Lun · hecho</span></div>
                        <div className="ph-row"><span className="dot" style={{ background: 'var(--green)' }}></span><span className="grow">Skill + Metcon</span><span className="val">Mar · hecho</span></div>
                        <div className="ph-row"><span className="dot" style={{ background: 'var(--green)' }}></span><span className="grow">Mixto</span><span className="val">Jue · hecho</span></div>
                        <div className="ph-row"><span className="dot" style={{ background: 'var(--ember)' }}></span><span className="grow" style={{ fontWeight: '600' }}>Fuerza</span><span className="val" style={{ color: 'var(--ember-soft)' }}>Hoy</span></div>
                      </div>
                      <div className="ph-card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><span className="ph-dim">Skill de la semana</span><br /><b style={{ fontFamily: 'var(--display)' }}>Toes-to-Bar</b></span>
                        <span className="mono ph-dim">4/4</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <article className="step" id="como">
              <div className="step-inner">
                <span className="eyebrow tag-amber">01 · Perfil</span>
                <h2>Te conoce antes del primer burpee.</h2>
                <p>Nivel, equipo, objetivos, frecuencia y lesiones. Si reportas el hombro, no verás kipping. Si entrenas en casa, no verás un remo.</p>
                <div className="detail"><span>Novato → Avanzado</span><span>4 tipos de equipo</span><span>Lesiones</span></div>
              </div>
            </article>

            <article className="step">
              <div className="step-inner">
                <span className="eyebrow tag-blue">02 · Periodización</span>
                <h2>Recuerda tus últimas cuatro semanas.</h2>
                <p>Analiza 28 días de entrenamientos para no repetir estímulos. Si llevas días sin pierna pesada, hoy toca pierna. Si el metcon viene cargado, baja.</p>
                <div className="detail"><span>Ventana de 28 días</span><span>Fuerza · Metcon · Gimnásticos · Cardio</span></div>
              </div>
            </article>

            <article className="step">
              <div className="step-inner">
                <span className="eyebrow tag-blue">03 · Cargas</span>
                <h2>Prescribe con tus números.</h2>
                <p>Registra tus PRs y cada carga sale de tu 1RM. Back Squat 5×5 al 75% significa 75 kg, no “algo pesado”.</p>
                <div className="detail"><span>% del 1RM</span><span>kg o lbs</span><span>Calculadora incluida</span></div>
              </div>
            </article>

            <article className="step">
              <div className="step-inner">
                <span className="eyebrow tag-red">04 · Modo en vivo</span>
                <h2>Te acompaña mientras entrenas.</h2>
                <p>Timer para AMRAP, EMOM, For Time y Tabata, con avisos de audio y la pantalla siempre encendida. Cuentas rondas con un toque.</p>
                <div className="detail"><span>Avisos de audio</span><span>Pantalla activa</span><span>Conteo de rondas</span></div>
              </div>
            </article>

            <article className="step">
              <div className="step-inner">
                <span className="eyebrow tag-flare">05 · Coach IA</span>
                <h2>Resuelve la duda en el momento.</h2>
                <p>El Coach IA conoce tu WOD de hoy, tu perfil y tus últimos entrenamientos. Pregúntale cómo escalar, qué peso usar o qué corregir.</p>
                <div className="detail"><span>Escalados</span><span>Técnica</span><span>Cargas</span></div>
              </div>
            </article>

            <article className="step">
              <div className="step-inner">
                <span className="eyebrow tag-green">06 · Programa</span>
                <h2>Planea el mes completo.</h2>
                <p>Mesociclos de cuatro semanas: base, volumen, intensidad y deload. Cada WOD del día sigue ese plan y su skill de la semana.</p>
                <div className="detail"><span>4 semanas</span><span>Deload incluido</span><span>Skill semanal</span></div>
              </div>
            </article>

          </div>
        </section>

        <section className="sheet" id="benchmarks" aria-labelledby="bm-title">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Biblioteca</span>
              <h2 id="bm-title">Los benchmarks de siempre, con tu historial.</h2>
              <p>Hazlos, registra tu resultado y compáralo cada vez que los repitas.</p>
            </div>
          </div>
          <div className="rails">
            <ul className="rail rail-a" aria-label="Benchmarks disponibles">
              <li className="wod"><b>Fran</b><span>21-15-9 Thrusters y Pull-ups</span></li>
              <li className="wod"><b>Grace</b><span>30 Clean &amp; Jerks</span></li>
              <li className="wod"><b>Diane</b><span>21-15-9 Deadlift y HSPU</span></li>
              <li className="wod"><b>Helen</b><span>3 rondas: 400 m, 21 KB swings, 12 pull-ups</span></li>
              <li className="wod"><b>Annie</b><span>50-40-30-20-10 Double unders y sit-ups</span></li>
              <li className="wod"><b>Isabel</b><span>30 Snatches</span></li>
              <li className="wod"><b>Jackie</b><span>1000 m remo, 50 thrusters, 30 pull-ups</span></li>
              <li className="wod"><b>Karen</b><span>150 Wall balls</span></li>
              <li className="wod"><b>Nancy</b><span>5 rondas: 400 m y 15 overhead squats</span></li>
              <li className="wod"><b>Murph</b><span>1 milla, 100-200-300, 1 milla</span></li>
              <li className="wod"><b>Cindy</b><span>AMRAP 20: 5 pull-ups, 10 push-ups, 15 squats</span></li>
              <li className="wod"><b>Mary</b><span>AMRAP 20: 5 HSPU, 10 pistols, 15 pull-ups</span></li>
            </ul>
            <ul className="rail rail-b" aria-hidden="true">
              <li className="wod"><b>Murph</b><span>1 milla, 100-200-300, 1 milla</span></li>
              <li className="wod"><b>Cindy</b><span>AMRAP 20: 5-10-15</span></li>
              <li className="wod"><b>Mary</b><span>AMRAP 20: HSPU, pistols, pull-ups</span></li>
              <li className="wod"><b>Fran</b><span>21-15-9 Thrusters y Pull-ups</span></li>
              <li className="wod"><b>Karen</b><span>150 Wall balls</span></li>
              <li className="wod"><b>Grace</b><span>30 Clean &amp; Jerks</span></li>
              <li className="wod"><b>Helen</b><span>3 rondas: 400 m, KB swings, pull-ups</span></li>
              <li className="wod"><b>Isabel</b><span>30 Snatches</span></li>
              <li className="wod"><b>Diane</b><span>21-15-9 Deadlift y HSPU</span></li>
              <li className="wod"><b>Jackie</b><span>Remo, thrusters, pull-ups</span></li>
              <li className="wod"><b>Nancy</b><span>400 m y overhead squats</span></li>
              <li className="wod"><b>Annie</b><span>Double unders y sit-ups</span></li>
            </ul>
          </div>

          <div className="wrap where" aria-labelledby="where-title">
            <div className="section-head">
              <span className="eyebrow">Donde entrenes</span>
              <h2 id="where-title">El WOD se arma con lo que tienes.</h2>
              <p>Cuatro niveles de equipo. Forgia cambia los movimientos, no te pide que cambies de gimnasio.</p>
            </div>
            <div className="where-grid">
              <div className="where-card">
                <span className="ico"><Dumbbell size={20} aria-hidden="true" /></span>
                <h3>Box completo</h3>
                <p>Remo, bike, anillas, cuerdas y barras. Todo entra en la rotación.</p>
              </div>
              <div className="where-card">
                <span className="ico"><Package size={20} aria-hidden="true" /></span>
                <h3>Box básico</h3>
                <p>Barra, mancuernas, kettlebells y cajas. El cardio sale de correr, burpees y cuerda.</p>
              </div>
              <div className="where-card">
                <span className="ico"><Building2 size={20} aria-hidden="true" /></span>
                <h3>Gimnasio tradicional</h3>
                <p>Mancuernas, poleas y caminadora. Los wall balls se vuelven thrusters con mancuerna.</p>
              </div>
              <div className="where-card">
                <span className="ico"><House size={20} aria-hidden="true" /></span>
                <h3>En casa</h3>
                <p>Peso corporal y lo que tengas a la mano. Diseñado para funcionar sin equipo.</p>
              </div>
            </div>
            <div className="levels">
              <span>Para cada nivel:</span>
              <span className="lv">Novato</span><span className="lv">Principiante</span><span className="lv">Intermedio</span><span className="lv">Avanzado</span>
              <span className="lv hy">+ Preparación HYROX</span>
            </div>
          </div>

          <div className="wrap">
            <section className="final" id="empezar" aria-labelledby="final-title">
              <div className="ember-orb" aria-hidden="true"></div>
              <div className="final-inner">
                <h2 id="final-title">Empieza<br />a forjar.</h2>
                <p>Crea tu cuenta, completa tu perfil y genera tu primer WOD hoy.</p>
                <Link className="btn btn-primary" href="/login">Empezar gratis
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <small>Sin tarjeta para empezar.</small>
              </div>
            </section>
          </div>

          <footer>
            <div className="wrap">
              <span>© 2026 Forgia</span>
              <nav aria-label="Legal">
                <Link href="/blog">Blog</Link>
                <Link href="/privacidad">Aviso de Privacidad</Link>
                <Link href="/terminos">Términos y Condiciones</Link>
              </nav>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
