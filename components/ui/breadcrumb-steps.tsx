import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbStep {
  id: number
  title: string
  shortTitle?: string
}

interface BreadcrumbStepsProps {
  steps: BreadcrumbStep[]
  currentStep: number
  onStepClick?: (step: number) => void
  className?: string
}

export function BreadcrumbSteps({ 
  steps, 
  currentStep, 
  onStepClick,
  className 
}: BreadcrumbStepsProps) {
  return (
    <nav className={cn("w-full", className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep
          const isCurrent = step.id === currentStep
          const isClickable = onStepClick && step.id <= currentStep
          
          return (
            <li key={step.id} className="flex items-center flex-1">
              <div className="flex items-center w-full">
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center group",
                    isClickable && "cursor-pointer",
                    !isClickable && "cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                      isCompleted && "bg-green-600 border-green-600",
                      isCurrent && "bg-white border-green-600",
                      !isCompleted && !isCurrent && "bg-gray-100 border-gray-300"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isCurrent && "text-green-600",
                          !isCurrent && "text-gray-500"
                        )}
                      >
                        {step.id}
                      </span>
                    )}
                  </div>
                  <div className="ml-3">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors",
                        (isCompleted || isCurrent) && "text-gray-900",
                        !isCompleted && !isCurrent && "text-gray-500",
                        isClickable && "group-hover:text-green-600"
                      )}
                    >
                      <span className="hidden sm:inline">{step.title}</span>
                      <span className="sm:hidden">{step.shortTitle || step.title}</span>
                    </p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div
                      className={cn(
                        "h-0.5 transition-all",
                        isCompleted ? "bg-green-600" : "bg-gray-300"
                      )}
                    />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}