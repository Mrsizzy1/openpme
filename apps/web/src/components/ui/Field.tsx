import React, { useId } from 'react';
import { CircleAlert } from 'lucide-react';
import { cx } from '../../lib/cx';

export interface FieldProps {
  /** Libellé du champ (phrase courte, sans deux-points). */
  label: React.ReactNode;
  /** Ajoute l'astérisque et l'attribut `required` au contrôle enfant. */
  required?: boolean;
  /** Aide affichée sous le champ (format attendu, conséquence…). */
  hint?: React.ReactNode;
  /** Message d'erreur : bordure rouge, `aria-invalid` et annonce aux lecteurs d'écran. */
  error?: React.ReactNode;
  /** Identifiant du contrôle. Généré et injecté dans l'enfant s'il n'en a pas. */
  htmlFor?: string;
  /** Occupe toute la largeur d'une grille `.form-grid`. */
  fullWidth?: boolean;
  /** Contrôle unique : `<input className="input-field" />`, `<select className="select-field">`… */
  children: React.ReactNode;
  className?: string;
}

/**
 * Habillage standard d'un champ de formulaire : libellé, contrôle, aide et erreur.
 * Relie automatiquement libellé ↔ contrôle et aide/erreur ↔ `aria-describedby`.
 *
 * @example
 * <Field label="Prix de vente" required hint="Toutes taxes comprises" error={errors.price}>
 *   <input className="input-field" type="number" value={price} onChange={...} />
 * </Field>
 */
export const Field: React.FC<FieldProps> = ({
  label,
  required = false,
  hint,
  error,
  htmlFor,
  fullWidth = false,
  children,
  className,
}) => {
  const generatedId = `field-${useId().replace(/:/g, '')}`;
  const child = React.Children.count(children) === 1 && React.isValidElement(children)
    ? (children as React.ReactElement<Record<string, unknown>>)
    : null;
  const controlId = htmlFor ?? (child?.props.id as string | undefined) ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [child?.props['aria-describedby'] as string | undefined, hintId, errorId]
    .filter(Boolean)
    .join(' ') || undefined;

  const control = child
    ? React.cloneElement(child, {
      id: controlId,
      'aria-describedby': describedBy,
      'aria-invalid': error ? true : child.props['aria-invalid'],
      required: required || child.props.required,
    })
    : children;

  return (
    <div className={cx('form-group', 'field', Boolean(error) && 'has-error', fullWidth && 'form-col-full', className)}>
      <label className="form-label" htmlFor={controlId}>
        {label}
        {required ? <span className="required" aria-hidden="true">*</span> : null}
      </label>
      {control}
      {hint && !error ? <p className="field-hint" id={hintId}>{hint}</p> : null}
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          <CircleAlert size={13} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
};
