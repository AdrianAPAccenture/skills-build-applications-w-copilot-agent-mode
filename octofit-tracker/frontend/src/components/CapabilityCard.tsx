import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Props<T> = {
  title: string;
  description: string;
  load: () => Promise<T[]>;
  emptyText: string;
  renderItem: (item: T, index: number) => ReactNode;
};

export function CapabilityCard<T>({
  title,
  description,
  load,
  emptyText,
  renderItem,
}: Props<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setItems(null);
    setError('');

    load()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load data');
        }
      });

    return () => {
      active = false;
    };
  }, [load]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {error ? (
          <p role="alert" className="text-danger">Error: {error}</p>
        ) : items === null ? (
          <p role="status">Loading {title.toLowerCase()}...</p>
        ) : items.length === 0 ? (
          <p>{emptyText}</p>
        ) : (
          <ul className="list-group list-group-flush">
            {items.map((item, index) => (
              <li className="list-group-item" key={index}>{renderItem(item, index)}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
