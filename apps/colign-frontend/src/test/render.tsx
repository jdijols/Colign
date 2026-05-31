import { type ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, type RenderOptions } from "@testing-library/react";

/**
 * Test renderer that wraps a component with the bits every page expects.
 *
 * MemoryRouter — react-router-dom requires a router ancestor, even for pages
 * that don't read location/params. Tests that need a specific URL pass
 * {@code initialEntries: ["/invite/abc"]}.
 *
 * No Redux store / Auth0 / Auth0Bridge — those are heavy dependencies that
 * push tests toward integration territory. Per-test {@code vi.mock} of the
 * RTK Query hooks and {@code useAuth0} gives faster, more focused unit tests.
 * Add a Provider here if a test genuinely needs the real store.
 */
export function renderWithRouter(
    ui: ReactElement,
    { initialEntries = ["/"], ...options }: { initialEntries?: string[] } & RenderOptions = {},
) {
    return render(ui, {
        wrapper: ({ children }) => (
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        ),
        ...options,
    });
}

/**
 * Build a RTK Query "stable" mock object — what {@code useSomeQuery()} returns
 * when it's settled with data. Lets tests skip the loading/error transitions
 * and assert directly on the rendered shape.
 */
export function mockQueryResult<T>(data: T) {
    return {
        data,
        isLoading: false,
        isFetching: false,
        isError: false,
        isSuccess: true,
        error: undefined,
        refetch: () => Promise.resolve({ data }),
    };
}

/** Loading state for a query hook mock. */
export function mockQueryLoading() {
    return {
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        isSuccess: false,
        error: undefined,
        refetch: () => Promise.resolve({}),
    };
}

/** Error state for a query hook mock. */
export function mockQueryError(error: unknown = { status: 500, data: null }) {
    return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        isSuccess: false,
        error,
        refetch: () => Promise.resolve({}),
    };
}
