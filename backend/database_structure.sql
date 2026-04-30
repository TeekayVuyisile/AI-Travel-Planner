--
-- PostgreSQL database dump
--

\restrict IhP9aE5WGg58JWyq59Tvp8WzYr6H4kdbz1TnnwxCnZRVMUW45cm4LRt2bbrDrSR

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2026-04-30 14:19:45

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 90337)
-- Name: saved_itineraries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_itineraries (
    id integer NOT NULL,
    trip_id integer,
    itinerary_data jsonb NOT NULL,
    weather_data jsonb,
    hotels_data jsonb,
    activities_data jsonb,
    budget_analysis jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.saved_itineraries OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 90336)
-- Name: saved_itineraries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.saved_itineraries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saved_itineraries_id_seq OWNER TO postgres;

--
-- TOC entry 4922 (class 0 OID 0)
-- Dependencies: 221
-- Name: saved_itineraries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saved_itineraries_id_seq OWNED BY public.saved_itineraries.id;


--
-- TOC entry 220 (class 1259 OID 90322)
-- Name: trips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trips (
    id integer NOT NULL,
    user_id integer,
    destination_city character varying(255) NOT NULL,
    destination_country character varying(255) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_budget numeric(10,2) NOT NULL,
    travelers_count integer NOT NULL,
    interests jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.trips OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 90321)
-- Name: trips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trips_id_seq OWNER TO postgres;

--
-- TOC entry 4923 (class 0 OID 0)
-- Dependencies: 219
-- Name: trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trips_id_seq OWNED BY public.trips.id;


--
-- TOC entry 218 (class 1259 OID 90309)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 90308)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 4924 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4757 (class 2604 OID 90340)
-- Name: saved_itineraries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_itineraries ALTER COLUMN id SET DEFAULT nextval('public.saved_itineraries_id_seq'::regclass);


--
-- TOC entry 4755 (class 2604 OID 90325)
-- Name: trips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips ALTER COLUMN id SET DEFAULT nextval('public.trips_id_seq'::regclass);


--
-- TOC entry 4752 (class 2604 OID 90312)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4769 (class 2606 OID 90345)
-- Name: saved_itineraries saved_itineraries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_itineraries
    ADD CONSTRAINT saved_itineraries_pkey PRIMARY KEY (id);


--
-- TOC entry 4766 (class 2606 OID 90330)
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- TOC entry 4761 (class 2606 OID 90320)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4763 (class 2606 OID 90318)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4767 (class 1259 OID 90353)
-- Name: idx_saved_itineraries_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_itineraries_trip_id ON public.saved_itineraries USING btree (trip_id);


--
-- TOC entry 4764 (class 1259 OID 90352)
-- Name: idx_trips_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_user_id ON public.trips USING btree (user_id);


--
-- TOC entry 4759 (class 1259 OID 90351)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4771 (class 2606 OID 90346)
-- Name: saved_itineraries saved_itineraries_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_itineraries
    ADD CONSTRAINT saved_itineraries_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- TOC entry 4770 (class 2606 OID 90331)
-- Name: trips trips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-04-30 14:19:45

--
-- PostgreSQL database dump complete
--

\unrestrict IhP9aE5WGg58JWyq59Tvp8WzYr6H4kdbz1TnnwxCnZRVMUW45cm4LRt2bbrDrSR
