import * as React from 'react';
import { cn } from '../../lib/utils';

const OTPContext = React.createContext<{ maxLength: number; inputId?: string } | null>(null);

type InputOTPProps = React.HTMLAttributes<HTMLDivElement> & {
	maxLength: number;
	id?: string;
};

function InputOTP({ className, maxLength, id, ...props }: InputOTPProps) {
	return (
		<OTPContext.Provider value={{ maxLength, inputId: id }}>
			<div
				className={cn('flex items-center justify-center gap-0', className)}
				data-slot="input-otp"
				data-max-length={maxLength}
				id={id}
				{...props}
			/>
		</OTPContext.Provider>
	);
}

const InputOTPGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div className={cn('flex items-center gap-2', className)} data-slot="input-otp-group" ref={ref} {...props} />
	),
);
InputOTPGroup.displayName = 'InputOTPGroup';

const InputOTPSeparator = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
	({ className, ...props }, ref) => (
		<span
			aria-hidden="true"
			className={cn('text-sm font-semibold tracking-[0.2em] text-[hsl(var(--muted-foreground))]', className)}
			data-slot="input-otp-separator"
			ref={ref}
			{...props}
		>
			-
		</span>
	),
);
InputOTPSeparator.displayName = 'InputOTPSeparator';

type InputOTPSlotProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
	index: number;
};

const InputOTPSlot = React.forwardRef<HTMLInputElement, InputOTPSlotProps>(
	({ className, index, id, ...props }, ref) => {
		const context = React.useContext(OTPContext);
		const resolvedId = id ?? (index === 0 ? context?.inputId : undefined);
		return (
			<input
				autoComplete={index === 0 ? 'one-time-code' : 'off'}
				className={cn(
					'flex h-12 w-11 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-transparent px-0 text-center text-xl font-semibold text-[hsl(var(--foreground))] shadow-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]',
					className,
				)}
				data-otp-input
				data-slot="input-otp-slot"
				id={resolvedId}
				inputMode="numeric"
				maxLength={1}
				pattern="[0-9]"
				ref={ref}
				type="text"
				{...props}
			/>
		);
	},
);
InputOTPSlot.displayName = 'InputOTPSlot';

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
