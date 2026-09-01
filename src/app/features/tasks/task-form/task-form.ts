import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import {
  TaskDraft,
  TaskPriority,
  TaskStatus,
  TaskView,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL_KEYS,
  TASK_STATUSES,
  TASK_STATUS_LABEL_KEYS,
  User,
} from '../../../core/interfaces';
import { CLOCK, parseApiDate, toApiDateString } from '../../../core/utils/date.utils';
import {
  doneCannotBeDueLater,
  dueDateNotInPast,
  dueDateWithinHorizon,
  highPriorityNeedsDueDate,
  notBlank,
  uniqueTags,
} from '../../../core/validators/task.validators';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { FieldError } from '../../../shared/components/field-error/field-error';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 600;
const TAG_MAX = 24;
const MAX_TAGS = 6;

interface TaskFormShape {
  title: FormControl<string>;
  description: FormControl<string>;
  status: FormControl<TaskStatus>;
  priority: FormControl<TaskPriority>;
  dueDate: FormControl<Date | null>;
  assigneeId: FormControl<string>;
  tags: FormArray<FormControl<string>>;
}

/**
 * Create/edit form for a task.
 *
 * Presentational in the sense that matters: it owns its own form state and
 * validity, but never talks to a store or the router. It emits a
 * {@link TaskDraft} and lets the caller decide what saving means.
 */
@Component({
  selector: 'app-task-form',
  imports: [
    Avatar,
    FieldError,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskForm {
  private readonly builder = inject(NonNullableFormBuilder);
  private readonly clock = inject(CLOCK);

  /** Existing task when editing; `undefined` when creating. */
  readonly task = input<TaskView | undefined>(undefined);

  readonly assignees = input.required<readonly User[]>();

  /** True while the caller is persisting, which disables the whole form. */
  readonly saving = input<boolean>(false);

  readonly save = output<TaskDraft>();
  readonly cancelled = output<void>();

  /** Reveals validation messages on controls the user never focused. */
  protected readonly submitted = signal(false);

  protected readonly statuses = TASK_STATUSES;
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly statusLabelKeys = TASK_STATUS_LABEL_KEYS;
  protected readonly priorityLabelKeys = TASK_PRIORITY_LABEL_KEYS;

  protected readonly titleMax = TITLE_MAX;
  protected readonly descriptionMax = DESCRIPTION_MAX;
  protected readonly maxTags = MAX_TAGS;

  protected readonly form: FormGroup<TaskFormShape> = this.builder.group(
    {
      title: this.builder.control('', [
        Validators.required,
        notBlank(),
        Validators.maxLength(TITLE_MAX),
      ]),
      description: this.builder.control('', [
        Validators.required,
        notBlank(),
        Validators.minLength(10),
        Validators.maxLength(DESCRIPTION_MAX),
      ]),
      status: this.builder.control<TaskStatus>('todo', [Validators.required]),
      priority: this.builder.control<TaskPriority>('medium', [Validators.required]),
      dueDate: this.builder.control<Date | null>(null, [
        dueDateNotInPast(() => this.clock()),
        dueDateWithinHorizon(() => this.clock()),
      ]),
      assigneeId: this.builder.control('', [Validators.required]),
      tags: this.builder.array<FormControl<string>>([], [uniqueTags()]),
    },
    {
      validators: [highPriorityNeedsDueDate(), doneCannotBeDueLater(() => this.clock())],
    },
  );

  protected readonly isEdit = computed(() => this.task() !== undefined);

  /** Name of the chosen assignee, for the select's custom trigger. */
  protected readonly selectedAssigneeName = computed(() => {
    const id = this.assigneeIdValue();
    return this.assignees().find((user) => user.id === id)?.name ?? '';
  });

  private readonly assigneeIdValue = toSignal(
    this.form.controls.assigneeId.events.pipe(
      startWith(null),
      map(() => this.form.controls.assigneeId.value),
    ),
    { initialValue: '' },
  );

  /** Character counts, so the limits are visible before they are hit. */
  protected readonly titleLength = signal(0);
  protected readonly descriptionLength = signal(0);

  constructor() {
    // Repopulate whenever the task changes, so the same component serves both
    // the composer and the editor without the caller recreating it.
    effect(() => {
      const task = this.task();
      const assignees = this.assignees();

      this.reset(task, assignees);
    });

    // Disabling the whole group while saving is simpler and safer than
    // disabling each control, and it also blocks Enter-to-submit.
    effect(() => {
      if (this.saving()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });

    this.form.controls.title.events.subscribe(() => {
      this.titleLength.set(this.form.controls.title.value.length);
    });

    this.form.controls.description.events.subscribe(() => {
      this.descriptionLength.set(this.form.controls.description.value.length);
    });
  }

  protected get tags(): FormArray<FormControl<string>> {
    return this.form.controls.tags;
  }

  /** Dynamic control: appends an empty tag input, up to {@link MAX_TAGS}. */
  protected addTag(value = ''): void {
    if (this.tags.length >= MAX_TAGS) {
      return;
    }

    this.tags.push(this.builder.control(value, [notBlank(), Validators.maxLength(TAG_MAX)]));
    this.tags.markAsDirty();
  }

  protected removeTag(index: number): void {
    this.tags.removeAt(index);
    this.tags.markAsDirty();
  }

  /**
   * Group validity lives on the `FormGroup`, not in a signal, so this tracks
   * `form.events` — otherwise the message would be computed once and then go
   * stale as the user edits.
   */
  private readonly formEvents = toSignal(this.form.events.pipe(startWith(null)), {
    initialValue: null,
  });

  /** Translation key for the group-level failure shown above the actions. */
  protected readonly formErrorKey = computed<string | null>(() => {
    this.formEvents();

    if (!this.submitted()) {
      return null;
    }

    const errors = this.form.errors;

    if (errors?.['highPriorityNeedsDueDate']) {
      return 'validation.highPriorityNeedsDueDate';
    }

    if (errors?.['doneCannotBeDueLater']) {
      return 'validation.doneCannotBeDueLater';
    }

    return null;
  });

  protected onSubmit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      // Surfaces every failure at once, and lets the browser scroll to the first.
      this.form.markAllAsTouched();
      return;
    }

    const draft = this.toDraft();

    if (draft) {
      this.save.emit(draft);
    }
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  /** Whether anything has actually been edited, for the unsaved-changes prompt. */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

  private reset(task: TaskView | undefined, assignees: readonly User[]): void {
    this.submitted.set(false);
    this.tags.clear({ emitEvent: false });

    if (task) {
      this.form.reset(
        {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: parseApiDate(task.dueDate),
          assigneeId: task.assignee.id,
        },
        { emitEvent: false },
      );

      for (const tag of task.tags) {
        this.addTag(tag);
      }
    } else {
      this.form.reset(
        {
          title: '',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          // Pre-selecting the first assignee saves a click in the common case
          // and keeps the form from opening in an invalid state for no reason.
          assigneeId: assignees[0]?.id ?? '',
        },
        { emitEvent: false },
      );
    }

    this.titleLength.set(this.form.controls.title.value.length);
    this.descriptionLength.set(this.form.controls.description.value.length);
    this.form.markAsPristine();
  }

  private toDraft(): TaskDraft | null {
    const value = this.form.getRawValue();
    const assignee = this.assignees().find((user) => user.id === value.assigneeId);

    if (!assignee) {
      return null;
    }

    return {
      title: value.title.trim(),
      description: value.description.trim(),
      status: value.status,
      priority: value.priority,
      // A task with no date is stored as today rather than as an empty string,
      // which keeps every downstream date calculation total.
      dueDate: toApiDateString(value.dueDate ?? this.clock()),
      assignee: {
        id: assignee.id,
        name: assignee.name,
        avatar: assignee.avatar,
        email: assignee.email,
      },
      tags: value.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    };
  }
}
