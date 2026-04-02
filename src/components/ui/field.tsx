import * as React from 'react';
import { cn } from '../../lib/utils';
import { Label } from './label';

const Field = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => <div className={cn('grid gap-2', className)} ref={ref} {...props} />,
);
Field.displayName = 'Field';

const FieldGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div className={cn('grid gap-4', className)} ref={ref} {...props} />
	),
);
FieldGroup.displayName = 'FieldGroup';

const FieldLabel = React.forwardRef<
	React.ElementRef<typeof Label>,
	React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => <Label className={cn('text-sm font-medium', className)} ref={ref} {...props} />);
FieldLabel.displayName = 'FieldLabel';

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	({ className, ...props }, ref) => (
		<p className={cn('text-sm leading-5 text-[hsl(var(--muted-foreground))]', className)} ref={ref} {...props} />
	),
);
FieldDescription.displayName = 'FieldDescription';

export { Field, FieldDescription, FieldGroup, FieldLabel };
