/**
 * T07c · Estado visual de los personajes del login. Función pura (S-09: sin pruebas de frontend, pero lista para
 * probarse). Nunca recibe la contraseña: solo dónde está el foco, si la contraseña se ve y cómo va el envío.
 */
export type CharacterFocus = 'none' | 'email' | 'password';
export type CharacterSubmitStatus = 'idle' | 'loading' | 'error' | 'success';

/**
 * Poses, de mayor a menor prioridad (CA12): `loading`, `error` y `success` (envío); `peeking` (contraseña visible:
 * ojos cerrados por privacidad, CA11); `password` (miran a la izquierda, CA10); `email` (se inclinan hacia el
 * formulario, CA9); `idle` (reposo, CA8).
 */
export type CharacterPose = 'idle' | 'email' | 'password' | 'peeking' | 'loading' | 'error' | 'success';

export interface CharacterInput {
  focus: CharacterFocus;
  passwordVisible: boolean;
  submitStatus: CharacterSubmitStatus;
}

export interface CharacterState {
  pose: CharacterPose;
  /** Las pupilas siguen el cursor solo en reposo y con el foco en el correo (CA8, CA9). */
  followCursor: boolean;
}

export function characterState({ focus, passwordVisible, submitStatus }: CharacterInput): CharacterState {
  let pose: CharacterPose;
  if (submitStatus !== 'idle') pose = submitStatus;
  else if (passwordVisible) pose = 'peeking';
  else if (focus === 'password') pose = 'password';
  else if (focus === 'email') pose = 'email';
  else pose = 'idle';

  return { pose, followCursor: pose === 'idle' || pose === 'email' };
}
