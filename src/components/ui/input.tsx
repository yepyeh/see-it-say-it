import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				className={cn(
					'flex h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-4 py-3 text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-50',
					className,
				)}
				ref={ref}
				type={type}
				{...props}
			/>
		);
	},
);
Input.displayName = 'Input';

export { Input };
