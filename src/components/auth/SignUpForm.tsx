'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/components/providers/I18nProvider';
import { PhoneVerificationCard } from '@/components/shared/PhoneVerificationCard';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FormValues = {
  userType: 'customer' | 'driver';
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

interface SignUpFormProps {
  onSuccess?: () => void;
  defaultRole?: 'customer' | 'driver';
}

export function SignUpForm({ onSuccess, defaultRole = 'customer' }: SignUpFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useI18n();

  const schema = z
    .object({
      userType: z.enum(['customer', 'driver'] as const),
      firstName: z.string().min(2, {
        message: t('auth.signup.firstNameMin'),
      }),
      lastName: z.string().min(2, {
        message: t('auth.signup.lastNameMin'),
      }),
      email: z.string().email({
        message: t('auth.login.errorEmailInvalid'),
      }),
      phoneNumber: z.string().min(10, {
        message: t('auth.signup.phoneMin'),
      }),
      password: z
        .string()
        .min(8, {
          message: t('auth.signup.passwordMin'),
        })
        .regex(/[A-Z]/, {
          message: t('auth.signup.passwordUpper'),
        })
        .regex(/[0-9]/, {
          message: t('auth.signup.passwordNumber'),
        }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.signup.passwordMismatch'),
      path: ['confirmPassword'],
    });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      userType: defaultRole,
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });
  const phoneNumber = form.watch('phoneNumber');

  const onSubmit = async (values: FormValues) => {
    if (!isPhoneVerified) {
      toast.error(t('phoneVerify.signupRequired'));
      return;
    }

    try {
      setIsLoading(true);
      await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        userType: values.userType,
        phoneNumber: values.phoneNumber,
      });
      toast.success(t('auth.signup.success'));
      onSuccess?.();
      router.push(`/${values.userType}/dashboard`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('auth.signup.failure');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.signup.cardTitle')}</CardTitle>
        <CardDescription>
          {t('auth.signup.cardDescription', { role: form.watch('userType') })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue={defaultRole}
          onValueChange={(value) => form.setValue('userType', value as 'customer' | 'driver')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="customer">{t('auth.signup.customerTab')}</TabsTrigger>
            <TabsTrigger value="driver">{t('auth.signup.driverTab')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.signup.firstName')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t('auth.signup.firstName')}
                          className="pl-10"
                          disabled={isLoading}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.signup.lastName')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t('auth.signup.lastName')}
                          className="pl-10"
                          disabled={isLoading}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.signup.email')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="email"
                        className="pl-10"
                        disabled={isLoading}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.signup.phone')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t('profile.phonePlaceholder')}
                        type="tel"
                        className="pl-10"
                        disabled={isLoading}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                )}
              />

            <PhoneVerificationCard
              phone={phoneNumber}
              onVerifiedChange={setIsPhoneVerified}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.signup.password')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.signup.confirmPassword')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full mt-6"
              disabled={isLoading || !isPhoneVerified}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.signup.creating')}
                </>
              ) : (
                t('auth.signup.create')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t('auth.signup.alreadyHave')}{' '}
          <Link 
            href="/login" 
            className="font-medium text-primary hover:underline"
            onClick={(e) => {
              if (isLoading) {
                e.preventDefault();
              }
            }}
          >
            {t('auth.signup.signIn')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
