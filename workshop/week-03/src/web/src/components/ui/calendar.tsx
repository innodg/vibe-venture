import "react-day-picker/style.css";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

export function Calendar({ className, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("rdp-root", className)}
      {...props}
    />
  );
}
