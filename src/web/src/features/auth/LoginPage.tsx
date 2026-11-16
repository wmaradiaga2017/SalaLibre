import { useEffect, useId, useRef, useState } from 'react';
import { Navigate } from 'react-router';
import { Banner, Spinner } from '../../shared/ui';
import { AnimatedCharacters } from './AnimatedCharacters';
import { useAuth } from './auth-context';
import type { CharacterFocus, CharacterSubmitStatus } from './characterState';
import { LoginForm, type LoginSubmitStatus } from './LoginForm';
import { usePrefersReducedMotion } from './useCharacterLook';

/** Duración de la reacción de error antes de volver a la postura del foco (CA12). */
const ERROR_POSE_MS = 900;
/** Celebración antes de ir a `/agenda` (CA12: ≤ 1 s). Sin animación (CA16), no se espera. */
const SUCCESS_DELAY_MS = 700;

/**
 * `/login` (spec §9, D-30; diseño `docs/diseño/stitch/login`). Escritorio (≥ 1024 px): tarjeta de dos columnas con la
 * ilustración a la izquierda y el formulario a la derecha. Más angosto: cabecera compacta (logo e ilustración) y el
 * formulario debajo. Con sesión válida, va a la agenda.
 */
export function LoginPage() {
  const { status } = useAuth();
  const reducedMotion = usePrefersReducedMotion();
  const [focus, setFocus] = useState<CharacterFocus>('none');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<CharacterSubmitStatus>('idle');
  const [forgotOpen, setForgotOpen] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forgotId = useId();

  useEffect(
    () => () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    },
    [],
  );

  const onSubmitStatusChange = (next: LoginSubmitStatus) => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setSubmitStatus(next);
    // Tras el error, vuelven a la postura que corresponda al foco (CA12).
    if (next === 'error') errorTimer.current = setTimeout(() => setSubmitStatus('idle'), ERROR_POSE_MS);
  };

  if (status === 'authenticated') return <Navigate to="/agenda" replace />;

  const year = new Date().getFullYear();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-gutter lg:p-margin">
      <div className="grid w-full max-w-[1080px] overflow-hidden rounded-lg border border-divider bg-surface-container-lowest shadow-elevated lg:h-[clamp(480px,calc(100dvh-48px),812px)] lg:grid-cols-[51fr_49fr]">
        {/* Columna visual: cabecera compacta en móvil y tableta; columna completa en escritorio. */}
        <section
          aria-label="SalaLibre"
          className="flex items-end justify-between gap-space-md border-b border-divider bg-mist px-gutter pt-space-lg lg:flex-col lg:items-stretch lg:justify-start lg:min-h-0 lg:border-r lg:border-b-0 lg:p-10"
        >
          <div className="flex min-w-0 flex-col gap-space-xl self-center lg:self-auto">
            <div className="flex items-center gap-space-md">
              <img src="/logo-icon.svg" alt="" className="size-11 shrink-0" />
              <div className="flex flex-col">
                <span className="text-lg leading-6 font-semibold text-ink">SalaLibre</span>
                <span className="text-label-xs tracking-widest whitespace-nowrap text-on-surface-variant uppercase">Reserva de salas</span>
              </div>
            </div>
            <div className="hidden flex-col gap-space-md lg:mt-[clamp(1rem,4dvh,3rem)] lg:flex">
              <p className="text-label-xs tracking-widest text-on-surface-variant uppercase">El espacio para tu equipo</p>
              <p className="text-[28px] leading-9 font-semibold tracking-tight text-ink">
                Tu próxima reunión,
                <br />
                en el lugar ideal<span className="text-primary-container">.</span>
              </p>
              <p className="max-w-xs text-body-md text-on-surface-variant">
                Encuentra una sala, coordina con tu equipo y reserva sin complicaciones.
              </p>
            </div>
          </div>

          <div className="h-28 w-36 shrink-0 sm:h-32 sm:w-44 lg:h-auto lg:min-h-0 lg:w-full lg:max-w-[440px] lg:flex-1 lg:self-center lg:pt-space-lg">
            <AnimatedCharacters
              focus={focus}
              passwordVisible={passwordVisible}
              submitStatus={submitStatus}
              className="h-full w-full"
            />
          </div>

          <p className="hidden items-center gap-space-sm text-body-sm text-on-surface-variant lg:mt-space-lg lg:flex">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-available" />
            Menos fricción. Más espacio para colaborar.
          </p>
        </section>

        {/* Columna del formulario. */}
        <section className="flex flex-col px-gutter sm:px-margin lg:min-h-0 lg:overflow-y-auto lg:px-14">
          <div className="mx-auto flex w-full max-w-[350px] flex-1 flex-col justify-center py-space-lg">
            <p className="flex items-center gap-space-sm text-label-xs tracking-widest text-primary-container uppercase">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary-container" />
              Acceso a SalaLibre
            </p>
            <h1 className="mt-space-md text-headline-lg text-ink">Bienvenido de nuevo</h1>
            <p className="mt-space-xs mb-space-xl text-body-md text-on-surface-variant">
              Inicia sesión para gestionar tus reservas de salas.
            </p>

            {status === 'loading' ? (
              <div className="flex justify-center py-space-xl">
                <Spinner label="Comprobando la sesión" />
              </div>
            ) : (
              <LoginForm
                onFocusChange={setFocus}
                onPasswordVisibleChange={setPasswordVisible}
                onSubmitStatusChange={onSubmitStatusChange}
                successDelayMs={reducedMotion ? 0 : SUCCESS_DELAY_MS}
                afterPassword={
                  <>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        aria-expanded={forgotOpen}
                        aria-controls={forgotId}
                        onClick={() => setForgotOpen((open) => !open)}
                        className="rounded-base text-body-sm font-medium text-primary-container underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div id={forgotId}>
                      {forgotOpen && (
                        <Banner tone="info">
                          La recuperación por correo no está disponible. Pide a RR. HH. que restablezca tu contraseña.
                        </Banner>
                      )}
                    </div>
                  </>
                }
              />
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-divider py-space-lg text-body-sm text-on-surface-variant">
            <span>Reserva de salas</span>
            <span className="tnum">© {year} SalaLibre</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
