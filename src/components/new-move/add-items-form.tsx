'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/components/providers/I18nProvider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type FormValues = {
  items: { name: string; quantity: number }[];
};

interface AddItemsFormProps {
  onNext: (data: FormValues) => void;
  onBack: () => void;
}

export function AddItemsForm({ onNext, onBack }: AddItemsFormProps) {
  const { t } = useI18n();
  const formSchema = z.object({
    items: z.array(
      z.object({
        name: z.string().min(1, t('newMove.validation.itemName')),
        quantity: z.coerce.number().min(1, t('newMove.validation.quantity')),
      })
    ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      items: [{ name: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onNext(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">{t('move.addItemHint')}</p>
        <div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-4 mb-4 p-4 border rounded-lg">
              <FormField
                control={form.control}
                name={`items.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>{t('newMove.itemName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('customer.form.itemName')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('newMove.quantity')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                aria-label={t('newMove.removeItem')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => append({ name: '', quantity: 1 })}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('newMove.addItem')}
        </Button>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            {t('newMove.backDetails')}
          </Button>
          <Button type="submit">{t('newMove.nextConfirm')}</Button>
        </div>
      </form>
    </Form>
  );
}
