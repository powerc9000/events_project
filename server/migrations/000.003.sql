CREATE TABLE public.logins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid references users(id) NOT NULL,
    created timestamp with time zone DEFAULT now(),
    expires timestamp with time zone NOT NULL
);
