interface StepHeaderProps {
  title: string;
  description: string;
  /** Usa <legend> cuando el paso entero es un grupo de opciones (dentro de un <fieldset>) */
  as?: 'h1' | 'legend';
  descriptionId?: string;
}

/** Título y bajada de cada paso del onboarding. */
export default function StepHeader({ title, description, as = 'h1', descriptionId }: StepHeaderProps) {
  const heading = <span className="block font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</span>;

  if (as === 'legend') {
    return (
      <>
        <legend className="w-full">
          <h1>{heading}</h1>
        </legend>
        <p id={descriptionId} className="mt-1.5 text-[15px] text-muted">
          {description}
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <h1>{heading}</h1>
      <p id={descriptionId} className="text-[15px] text-muted">
        {description}
      </p>
    </div>
  );
}
